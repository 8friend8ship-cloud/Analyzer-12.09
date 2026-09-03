# frozen_string_literal: true
# Central SketchUp native learning manifest exporter V2
# Local-only: no network, no shell, no credentials.
# Geometry truth must come from the active native SketchUp model.

require 'sketchup.rb'
require 'json'
require 'fileutils'
require 'digest'
require 'time'

module CentralSketchupLearning
  extend self

  VERSION = 'CENTRAL_SKP_MANIFEST_EXPORTER_V2_NATIVE_GEOMETRY_20260903'
  MM_PER_INCH = 25.4
  MAX_DEPTH = 64
  BOUNDS_TOLERANCE_MM = 0.5

  UNIT_LABELS = {
    0 => 'INCH',
    1 => 'FOOT',
    2 => 'MM',
    3 => 'CM',
    4 => 'M',
    5 => 'YARD'
  }.freeze

  def now_iso
    Time.now.iso8601
  end

  def safe_name(value)
    s = value.to_s.strip
    s = 'untitled' if s.empty?
    s.gsub(/[\\\/:*?"<>|]+/, '_')[0, 120]
  end

  def point_mm(point)
    [point.x.to_f * MM_PER_INCH, point.y.to_f * MM_PER_INCH, point.z.to_f * MM_PER_INCH].map { |v| v.round(3) }
  end

  def bounds_mm(bounds)
    min = bounds.min
    max = bounds.max
    {
      min: point_mm(min),
      max: point_mm(max),
      width: ((max.x - min.x).to_f * MM_PER_INCH).round(3),
      depth: ((max.y - min.y).to_f * MM_PER_INCH).round(3),
      height: ((max.z - min.z).to_f * MM_PER_INCH).round(3)
    }
  rescue StandardError => e
    { error: e.message }
  end

  def bbox_from_points(points)
    bb = Geom::BoundingBox.new
    points.each { |p| bb.add(p) }
    bb
  end

  def transformed_bounds(bounds, transform)
    points = (0..7).map { |i| bounds.corner(i).transform(transform) }
    bbox_from_points(points)
  end

  def unit_info(model)
    opts = model.options['UnitsOptions']
    code = opts['LengthUnit'] rescue nil
    {
      length_unit_code: code,
      length_unit_label: UNIT_LABELS.fetch(code, "UNKNOWN_#{code}"),
      length_format: (opts['LengthFormat'] rescue nil),
      length_precision: (opts['LengthPrecision'] rescue nil),
      suppress_units: (opts['SuppressUnitsDisplay'] rescue nil)
    }
  end

  def visible_in_context?(entity, inherited_visible)
    return false unless inherited_visible
    return false if (entity.hidden? rescue false)
    layer = (entity.layer rescue nil)
    return false if layer && !(layer.visible? rescue true)
    true
  end

  def add_entity_geometry_to_bounds(entity, parent_transform, bb)
    case entity
    when Sketchup::Face
      entity.vertices.each { |v| bb.add(v.position.transform(parent_transform)) }
    when Sketchup::Edge
      bb.add(entity.start.position.transform(parent_transform))
      bb.add(entity.end.position.transform(parent_transform))
    when Sketchup::ConstructionPoint
      bb.add(entity.position.transform(parent_transform))
    when Sketchup::Group, Sketchup::ComponentInstance
      definition = entity.definition
      world_t = parent_transform * entity.transformation
      child_bb = transformed_bounds(definition.bounds, world_t)
      bb.add(child_bb.min)
      bb.add(child_bb.max)
    end
  rescue StandardError
    nil
  end

  # Traverses each effective occurrence from the root. This means nested component
  # occurrences are counted once for each parent occurrence, matching the physical
  # model rather than the number of unique definition objects.
  def traverse_effective(entities, state, parent_transform = Geom::Transformation.new, inherited_visible = true, depth = 0, definition_stack = [])
    return if depth > MAX_DEPTH

    entities.each do |entity|
      type = entity.typename.to_s
      state[:effective_entity_counts][type] += 1
      is_visible = visible_in_context?(entity, inherited_visible)
      state[:visible_effective_entity_counts][type] += 1 if is_visible

      add_entity_geometry_to_bounds(entity, parent_transform, state[:world_bounds_all])
      add_entity_geometry_to_bounds(entity, parent_transform, state[:world_bounds_visible]) if is_visible

      case entity
      when Sketchup::ComponentInstance
        definition = entity.definition
        key = definition.guid.to_s.empty? ? definition.name.to_s : definition.guid.to_s
        stat = state[:effective_component_occurrences][key] ||= {
          definition_name: definition.name.to_s,
          definition_guid: definition.guid.to_s,
          effective_occurrence_count: 0,
          visible_effective_occurrence_count: 0
        }
        stat[:effective_occurrence_count] += 1
        stat[:visible_effective_occurrence_count] += 1 if is_visible

        unless definition_stack.include?(key)
          traverse_effective(
            definition.entities,
            state,
            parent_transform * entity.transformation,
            is_visible,
            depth + 1,
            definition_stack + [key]
          )
        else
          state[:recursive_definition_guard_hits] += 1
        end
      when Sketchup::Group
        state[:effective_group_count] += 1
        state[:visible_effective_group_count] += 1 if is_visible
        key = "GROUP:#{entity.definition.guid}"
        unless definition_stack.include?(key)
          traverse_effective(
            entity.entities,
            state,
            parent_transform * entity.transformation,
            is_visible,
            depth + 1,
            definition_stack + [key]
          )
        else
          state[:recursive_definition_guard_hits] += 1
        end
      end
    rescue StandardError => e
      state[:entity_read_errors] += 1
      state[:entity_read_error_samples] << "#{type}:#{e.class}:#{e.message}" if state[:entity_read_error_samples].length < 10
    end
  end

  def geometry_traversal(model)
    state = {
      effective_entity_counts: Hash.new(0),
      visible_effective_entity_counts: Hash.new(0),
      effective_component_occurrences: {},
      effective_group_count: 0,
      visible_effective_group_count: 0,
      world_bounds_all: Geom::BoundingBox.new,
      world_bounds_visible: Geom::BoundingBox.new,
      recursive_definition_guard_hits: 0,
      entity_read_errors: 0,
      entity_read_error_samples: []
    }
    traverse_effective(model.entities, state)
    {
      effective_entity_counts: state[:effective_entity_counts],
      visible_effective_entity_counts: state[:visible_effective_entity_counts],
      effective_component_occurrences: state[:effective_component_occurrences].values.sort_by { |x| x[:definition_name] },
      effective_group_count: state[:effective_group_count],
      visible_effective_group_count: state[:visible_effective_group_count],
      world_bounds_all_mm: state[:world_bounds_all].empty? ? {} : bounds_mm(state[:world_bounds_all]),
      world_bounds_visible_mm: state[:world_bounds_visible].empty? ? {} : bounds_mm(state[:world_bounds_visible]),
      recursive_definition_guard_hits: state[:recursive_definition_guard_hits],
      entity_read_errors: state[:entity_read_errors],
      entity_read_error_samples: state[:entity_read_error_samples]
    }
  end

  def component_manifest(model, traversal = nil)
    effective_by_guid = {}
    Array(traversal && traversal[:effective_component_occurrences]).each do |row|
      effective_by_guid[row[:definition_guid].to_s] = row
    end

    definitions = model.definitions.reject { |d| (d.image? || d.group?) rescue false }
    definitions.map do |definition|
      guid = definition.guid.to_s
      instances = definition.instances rescue []
      unique_count = (definition.count_instances rescue instances.length)
      used_count = (definition.count_used_instances rescue nil)
      traversal_count = effective_by_guid.dig(guid, :effective_occurrence_count)
      {
        definition_name: definition.name.to_s,
        definition_guid: guid,
        persistent_id: (definition.persistent_id rescue nil),
        description: (definition.description.to_s rescue ''),
        unique_instance_count: unique_count,
        used_instance_count: used_count,
        instances_array_count: instances.length,
        traversal_effective_occurrence_count: traversal_count,
        used_instance_crosscheck: used_count.nil? || traversal_count.nil? ? 'UNAVAILABLE' : (used_count == traversal_count ? 'PASS' : 'MISMATCH'),
        bounds_mm: bounds_mm(definition.bounds),
        entity_count: (definition.entities.length rescue nil),
        live_component: (definition.live_component? rescue nil),
        behavior: {
          cuts_opening: (definition.behavior.cuts_opening? rescue nil),
          always_face_camera: (definition.behavior.always_face_camera? rescue nil)
        }
      }
    rescue StandardError => e
      { definition_name: definition.name.to_s, error: e.message }
    end
  end

  def bom_manifest(model, traversal = nil)
    component_manifest(model, traversal).map do |row|
      {
        item: row[:definition_name],
        definition_guid: row[:definition_guid],
        unique_instance_count: row[:unique_instance_count],
        quantity_used_instances: row[:used_instance_count],
        traversal_effective_occurrence_count: row[:traversal_effective_occurrence_count],
        count_crosscheck: row[:used_instance_crosscheck],
        bounds_mm: row[:bounds_mm],
        source: 'SKETCHUP_COMPONENT_DEFINITION_COUNT_USED_INSTANCES'
      }
    end
  end

  def material_manifest(model)
    model.materials.map do |material|
      texture = material.texture rescue nil
      color = material.color rescue nil
      {
        name: material.name.to_s,
        display_name: (material.display_name.to_s rescue material.name.to_s),
        alpha: (material.alpha.to_f.round(4) rescue nil),
        color_rgb: color ? [color.red, color.green, color.blue] : nil,
        texture_filename: (texture.filename.to_s rescue nil),
        texture_size: (texture ? [texture.width.to_f, texture.height.to_f] : nil)
      }
    rescue StandardError => e
      { name: material.name.to_s, error: e.message }
    end
  end

  def tag_manifest(model)
    model.layers.map do |layer|
      {
        name: layer.name.to_s,
        visible: (layer.visible? rescue nil),
        folder: (layer.folder.name.to_s rescue nil)
      }
    rescue StandardError => e
      { name: layer.name.to_s, error: e.message }
    end
  end

  def camera_hash(camera)
    return {} unless camera
    {
      eye_mm: point_mm(camera.eye),
      target_mm: point_mm(camera.target),
      up: [camera.up.x.to_f, camera.up.y.to_f, camera.up.z.to_f].map { |v| v.round(6) },
      perspective: camera.perspective?,
      fov: (camera.fov.to_f.round(4) rescue nil),
      focal_length: (camera.focal_length.to_f.round(4) rescue nil),
      height: (camera.height.to_f.round(4) rescue nil)
    }
  end

  def scene_manifest(model)
    model.pages.map do |page|
      cam = (page.camera rescue nil)
      {
        name: page.name.to_s,
        description: (page.description.to_s rescue ''),
        camera: camera_hash(cam),
        use_camera: (page.use_camera? rescue nil),
        use_hidden: (page.use_hidden? rescue nil),
        use_hidden_layers: (page.use_hidden_layers? rescue nil),
        use_section_planes: (page.use_section_planes? rescue nil),
        use_rendering_options: (page.use_rendering_options? rescue nil),
        use_shadow_info: (page.use_shadow_info? rescue nil)
      }
    rescue StandardError => e
      { name: page.name.to_s, error: e.message }
    end
  end

  def model_identity(model)
    path = model.path.to_s
    title = model.title.to_s
    stat = (File.stat(path) rescue nil)
    basis = [path, title, stat&.size, stat&.mtime&.to_i].join('|')
    {
      title: title,
      path: path,
      file_name: File.basename(path.empty? ? title : path),
      file_size: stat&.size,
      file_mtime: stat&.mtime&.iso8601,
      local_signature: Digest::SHA256.hexdigest(basis)[0, 24]
    }
  end

  def dimensions_close?(a, b, tolerance = BOUNDS_TOLERANCE_MM)
    %i[width depth height].all? do |k|
      av = a[k] || a[k.to_s]
      bv = b[k] || b[k.to_s]
      av && bv && (av.to_f - bv.to_f).abs <= tolerance
    end
  end

  def geometry_qa(model_bounds, traversal, components)
    world = traversal[:world_bounds_all_mm] || {}
    component_mismatches = components.select { |r| r[:used_instance_crosscheck] == 'MISMATCH' }.map { |r| r[:definition_name] }
    issues = []
    issues << 'MODEL_BOUNDS_VS_TRAVERSAL_MISMATCH' unless world.empty? || dimensions_close?(model_bounds, world)
    issues << 'COMPONENT_USED_INSTANCE_CROSSCHECK_MISMATCH' unless component_mismatches.empty?
    issues << 'ENTITY_READ_ERRORS' if traversal[:entity_read_errors].to_i > 0
    {
      pass: issues.empty?,
      issues: issues,
      model_bounds_vs_world_traversal: world.empty? ? 'UNAVAILABLE' : (dimensions_close?(model_bounds, world) ? 'PASS' : 'MISMATCH'),
      component_mismatch_count: component_mismatches.length,
      component_mismatch_samples: component_mismatches.first(20),
      entity_read_errors: traversal[:entity_read_errors],
      tolerance_mm: BOUNDS_TOLERANCE_MM
    }
  end

  def write_preview(view, out_path, width = 1600, height = 1200)
    opts = {
      filename: out_path,
      width: width,
      height: height,
      antialias: true,
      compression: 0.9,
      transparent: false
    }
    view.write_image(opts)
    File.exist?(out_path) ? out_path : nil
  rescue StandardError
    nil
  end

  def export_standard_previews(model, output_dir)
    view = model.active_view
    original_camera = view.camera
    previews = {}

    begin
      active = File.join(output_dir, 'preview_active.png')
      previews[:active] = write_preview(view, active)

      center = model.bounds.center
      diag = model.bounds.diagonal.to_f
      distance = [diag * 1.8, 120.0].max

      top_camera = Sketchup::Camera.new(
        Geom::Point3d.new(center.x, center.y, center.z + distance),
        center,
        Geom::Vector3d.new(0, 1, 0),
        false
      )
      view.camera = top_camera
      view.zoom_extents
      previews[:top] = write_preview(view, File.join(output_dir, 'preview_top.png'))

      iso_eye = Geom::Point3d.new(center.x + distance, center.y - distance, center.z + distance)
      iso_camera = Sketchup::Camera.new(iso_eye, center, Geom::Vector3d.new(0, 0, 1), true)
      view.camera = iso_camera
      view.zoom_extents
      previews[:isometric] = write_preview(view, File.join(output_dir, 'preview_iso.png'))
    ensure
      view.camera = original_camera if original_camera
      view.invalidate
    end

    previews.compact
  end

  def build_manifest(model)
    identity = model_identity(model)
    native_model_bounds = bounds_mm(model.bounds)
    traversal = geometry_traversal(model)
    components = component_manifest(model, traversal)
    qa = geometry_qa(native_model_bounds, traversal, components)

    {
      schema_version: 'SKP_MODEL_MANIFEST_V2_NATIVE_GEOMETRY',
      exporter_version: VERSION,
      extracted_at: now_iso,
      model: identity.merge(
        unit: unit_info(model),
        bounds_mm: native_model_bounds,
        active_layer: (model.active_layer.name.to_s rescue nil),
        active_path_depth: (model.active_path ? model.active_path.length : 0)
      ),
      geometry: traversal,
      entity_counts: traversal[:effective_entity_counts],
      visible_entity_counts: traversal[:visible_effective_entity_counts],
      components: components,
      materials: material_manifest(model),
      tags: tag_manifest(model),
      scenes: scene_manifest(model),
      active_camera: camera_hash(model.active_view.camera),
      bom: bom_manifest(model, traversal),
      qa: {
        content_extracted: true,
        native_geometry_extracted: true,
        geometry_truth_source: 'NATIVE_SKETCHUP_MODEL',
        geometry_crosscheck: qa,
        exact_quantity_rule: 'COMPONENT_DEFINITION_COUNT_USED_INSTANCES',
        exact_bounds_rule: 'MODEL_BOUNDS_PLUS_WORLD_TRANSFORM_TRAVERSAL_CROSSCHECK',
        requires_rights_review: true,
        requires_dimension_collision_clearance_qa: true,
        metadata_only_seed_forbidden: true
      }
    }
  end

  def export_current_model(output_dir = nil)
    model = Sketchup.active_model
    raise 'No active SketchUp model' unless model

    identity = model_identity(model)
    base = safe_name(File.basename(identity[:file_name].to_s, '.*'))
    output_dir ||= File.join(Dir.home, 'CentralSketchupExports', base)
    FileUtils.mkdir_p(output_dir)

    manifest = build_manifest(model)
    manifest[:previews] = export_standard_previews(model, output_dir)

    out = File.join(output_dir, 'model_manifest.json')
    File.open(out, 'w:UTF-8') { |f| f.write(JSON.pretty_generate(manifest)) }

    receipt = {
      ok: manifest.dig(:qa, :geometry_crosscheck, :pass) == true,
      exporter_version: VERSION,
      manifest_path: out,
      preview_paths: manifest[:previews].values,
      extracted_at: manifest[:extracted_at],
      local_signature: manifest.dig(:model, :local_signature),
      geometry_qa: manifest.dig(:qa, :geometry_crosscheck)
    }
    receipt_path = File.join(output_dir, 'export_receipt.json')
    File.open(receipt_path, 'w:UTF-8') { |f| f.write(JSON.pretty_generate(receipt)) }
    receipt
  rescue StandardError => e
    {
      ok: false,
      exporter_version: VERSION,
      error_class: e.class.name,
      error: e.message,
      backtrace: Array(e.backtrace).first(8),
      extracted_at: now_iso
    }
  end

  unless file_loaded?(__FILE__)
    UI.menu('Extensions').add_item('Central SketchUp: Export Native Geometry Manifest V2') do
      result = export_current_model
      UI.messagebox(result[:ok] ? "Exported: #{result[:manifest_path]}" : "Export completed with QA issue: #{result[:error] || result[:geometry_qa]}")
    end
    file_loaded(__FILE__)
  end
end
