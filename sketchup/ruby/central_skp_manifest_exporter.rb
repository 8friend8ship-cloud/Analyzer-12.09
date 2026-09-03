# frozen_string_literal: true
# Central SketchUp manifest exporter
# Local-only: no network, no shell, no credentials.
# Intended to be loaded inside SketchUp Ruby.

require 'sketchup.rb'
require 'json'
require 'fileutils'
require 'digest'

module CentralSketchupLearning
  extend self

  VERSION = 'CENTRAL_SKP_MANIFEST_EXPORTER_V1_20260903'
  MM_PER_INCH = 25.4

  UNIT_LABELS = {
    0 => 'INCH',
    1 => 'FOOT',
    2 => 'MM',
    3 => 'CM',
    4 => 'M',
    5 => 'YARD'
  }.freeze

  def now_iso
    Time.now.strftime('%Y-%m-%dT%H:%M:%S%z')
  end

  def safe_name(value)
    s = value.to_s.strip
    s = 'untitled' if s.empty?
    s.gsub(/[\\\/:*?"<>|]+/, '_')[0, 120]
  end

  def point_mm(point)
    [point.x.to_f * MM_PER_INCH, point.y.to_f * MM_PER_INCH, point.z.to_f * MM_PER_INCH].map { |v| v.round(2) }
  end

  def bounds_mm(bounds)
    min = bounds.min
    max = bounds.max
    {
      min: point_mm(min),
      max: point_mm(max),
      width: ((max.x - min.x).to_f * MM_PER_INCH).round(2),
      depth: ((max.y - min.y).to_f * MM_PER_INCH).round(2),
      height: ((max.z - min.z).to_f * MM_PER_INCH).round(2)
    }
  rescue StandardError => e
    { error: e.message }
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

  def entity_counts(entities, counts = nil, depth = 0)
    counts ||= Hash.new(0)
    return counts if depth > 64

    entities.each do |entity|
      key = entity.typename.to_s
      counts[key] += 1
      if entity.is_a?(Sketchup::Group)
        entity_counts(entity.entities, counts, depth + 1)
      elsif entity.is_a?(Sketchup::ComponentInstance)
        entity_counts(entity.definition.entities, counts, depth + 1)
      end
    rescue StandardError
      counts['ENTITY_READ_ERROR'] += 1
    end
    counts
  end

  def component_manifest(model)
    definitions = model.definitions.reject { |d| d.image? || d.group? rescue false }
    definitions.map do |definition|
      instances = definition.instances rescue []
      {
        definition_name: definition.name.to_s,
        description: (definition.description.to_s rescue ''),
        instance_count: instances.length,
        bounds_mm: bounds_mm(definition.bounds),
        entity_count: (definition.entities.length rescue nil),
        behavior: {
          cuts_opening: (definition.behavior.cuts_opening? rescue nil),
          always_face_camera: (definition.behavior.always_face_camera? rescue nil)
        }
      }
    rescue StandardError => e
      { definition_name: definition.name.to_s, error: e.message }
    end
  end

  def bom_manifest(model)
    component_manifest(model).map do |row|
      {
        item: row[:definition_name],
        quantity: row[:instance_count],
        bounds_mm: row[:bounds_mm],
        source: 'SKETCHUP_COMPONENT_DEFINITION'
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
      top = File.join(output_dir, 'preview_top.png')
      previews[:top] = write_preview(view, top)

      iso_eye = Geom::Point3d.new(center.x + distance, center.y - distance, center.z + distance)
      iso_camera = Sketchup::Camera.new(iso_eye, center, Geom::Vector3d.new(0, 0, 1), true)
      view.camera = iso_camera
      view.zoom_extents
      iso = File.join(output_dir, 'preview_iso.png')
      previews[:isometric] = write_preview(view, iso)
    ensure
      view.camera = original_camera if original_camera
      view.invalidate
    end

    previews.compact
  end

  def build_manifest(model)
    identity = model_identity(model)
    {
      schema_version: 'SKP_MODEL_MANIFEST_V1',
      exporter_version: VERSION,
      extracted_at: now_iso,
      model: identity.merge(
        unit: unit_info(model),
        bounds_mm: bounds_mm(model.bounds),
        active_layer: (model.active_layer.name.to_s rescue nil),
        active_path_depth: (model.active_path ? model.active_path.length : 0)
      ),
      entity_counts: entity_counts(model.entities),
      components: component_manifest(model),
      materials: material_manifest(model),
      tags: tag_manifest(model),
      scenes: scene_manifest(model),
      active_camera: camera_hash(model.active_view.camera),
      bom: bom_manifest(model),
      qa: {
        content_extracted: true,
        geometry_truth_source: 'NATIVE_SKETCHUP_MODEL',
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
      ok: true,
      exporter_version: VERSION,
      manifest_path: out,
      preview_paths: manifest[:previews].values,
      extracted_at: manifest[:extracted_at],
      local_signature: manifest.dig(:model, :local_signature)
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
    UI.menu('Extensions').add_item('Central SketchUp: Export Learning Manifest') do
      result = export_current_model
      UI.messagebox(result[:ok] ? "Exported: #{result[:manifest_path]}" : "Export failed: #{result[:error]}")
    end
    file_loaded(__FILE__)
  end
end
