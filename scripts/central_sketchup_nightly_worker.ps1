param(
  [switch]$ForceTest,
  [switch]$InventoryOnly,
  [int]$MaxModelsPerRun = 3
)
$ErrorActionPreference='Stop'
$RunnerRoot='C:\Users\User\Documents\CentralSketchupRunner'
$StateRoot='C:\Users\User\Documents\CentralSketchupWorking\night_skp_state'
$ExportRoot='G:\내 드라이브\HomeDesign_Agent_Platform\04_MEDIA_FACTORY\06_RENDER_SKETCHUP\30_NIGHT_CORPUS'
$Roots=@(
 'G:\다른 컴퓨터\내 노트북\홈디자인',
 'G:\내 드라이브\홈디자인'
)
$SketchupExe='C:\Program Files\SketchUp\SketchUp 2022\SketchUp.exe'
$Exporter=Join-Path $RunnerRoot 'sketchup\ruby\central_skp_manifest_exporter.rb'
$Builder=Join-Path $RunnerRoot 'python\central_skp_seed_builder.py'
New-Item -ItemType Directory -Force -Path $StateRoot,$ExportRoot | Out-Null
$RunLog=Join-Path $StateRoot 'night_worker.jsonl'
$DoneFile=Join-Path $StateRoot 'completed_keys.txt'
$InventoryFile=Join-Path $StateRoot 'corpus_inventory.json'
function Write-RunLog($obj){
 $obj.at=(Get-Date).ToString('o'); Add-Content -Path $RunLog -Value ($obj|ConvertTo-Json -Compress -Depth 8) -Encoding UTF8
}
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class IdleNative {
 [StructLayout(LayoutKind.Sequential)] public struct LASTINPUTINFO { public uint cbSize; public uint dwTime; }
 [DllImport("user32.dll")] public static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);
}
'@
function Get-IdleSeconds {
 $x=New-Object IdleNative+LASTINPUTINFO; $x.cbSize=[Runtime.InteropServices.Marshal]::SizeOf($x)
 [void][IdleNative]::GetLastInputInfo([ref]$x)
 return [math]::Max(0,([Environment]::TickCount - [int]$x.dwTime)/1000)
}
function Test-NightWindow {
 $h=(Get-Date).Hour; return ($h -ge 0 -and $h -lt 7)
}
function Test-HeavyWork {
 $names=@('SketchUp','D5Render','D5Launcher','D5Converter','ffmpeg','blender','3dsmax','Revit')
 return [bool](Get-Process -ErrorAction SilentlyContinue | Where-Object { $names -contains $_.ProcessName } | Select-Object -First 1)
}
function Get-Key([System.IO.FileInfo]$f){
 $raw="$($f.FullName)|$($f.Length)|$($f.LastWriteTimeUtc.Ticks)"
 $sha=[Security.Cryptography.SHA256]::Create(); try { return ([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($raw))).Replace('-','').Substring(0,20)) } finally {$sha.Dispose()}
}
function Build-Inventory {
 $rows=New-Object System.Collections.Generic.List[object]
 foreach($root in $Roots){
   if(!(Test-Path $root)){ continue }
   Get-ChildItem -Path $root -Filter *.skp -File -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
     $class='PROJECT'
     if($_.FullName -match '\\ikea\\'){ $class='IKEA_ASSET' }
     elseif($_.Name -like 'AutoSave_*'){ $class='AUTOSAVE' }
     elseif($_.FullName -match '모듈러주택|농막'){ $class='MODULAR' }
     $rank=@{PROJECT=0;MODULAR=1;IKEA_ASSET=2;AUTOSAVE=3}[$class]
     $rows.Add([pscustomobject]@{key=(Get-Key $_);path=$_.FullName;name=$_.Name;bytes=$_.Length;modified=$_.LastWriteTime.ToString('o');class=$class;rank=$rank})
   }
 }
 $rows | Sort-Object rank,@{Expression='modified';Descending=$true},bytes | ConvertTo-Json -Depth 4 | Set-Content -Path $InventoryFile -Encoding UTF8
 return $rows.Count
}
$needInventory=!(Test-Path $InventoryFile)
if(!$needInventory){ $needInventory=((Get-Date)-(Get-Item $InventoryFile).LastWriteTime).TotalHours -gt 6 }
if($needInventory -or $ForceTest){
 $count=Build-Inventory
 Write-RunLog ([ordered]@{event='INVENTORY';count=$count;roots=$Roots})
}
if($InventoryOnly){ Write-Output "INVENTORY_ONLY_PASS $InventoryFile"; exit 0 }
if(!$ForceTest -and !(Test-NightWindow)){ Write-RunLog ([ordered]@{event='SKIP';reason='OUTSIDE_00_07_KST'}); exit 0 }
if(!$ForceTest -and (Get-IdleSeconds) -lt 900){ Write-RunLog ([ordered]@{event='SKIP';reason='USER_NOT_IDLE_15M';idleSeconds=(Get-IdleSeconds)}); exit 0 }
if(Test-HeavyWork){ Write-RunLog ([ordered]@{event='SKIP';reason='HEAVY_PROCESS_ACTIVE'}); exit 0 }
Add-Type @'
using System;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public static class SkpNative {
 public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
 [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc cb, IntPtr lp);
 [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr hWnd, EnumWindowsProc cb, IntPtr lp);
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd,StringBuilder sb,int max);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr hWnd,StringBuilder sb,int max);
 [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr hWnd,uint msg,IntPtr w,IntPtr l);
 [DllImport("user32.dll",CharSet=CharSet.Unicode,SetLastError=true)] public static extern IntPtr SendMessageTimeout(IntPtr h,uint m,IntPtr w,string l,uint flags,uint timeout,out IntPtr result);
}
'@
function Invoke-SkpConsoleExport($proc,$outDir){
 $main=[IntPtr]$proc.MainWindowHandle; if($main -eq [IntPtr]::Zero){ return $false }
 [SkpNative]::PostMessage($main,0x0111,[IntPtr]21478,[IntPtr]::Zero)|Out-Null
 Start-Sleep -Seconds 2
 $ruby=[IntPtr]::Zero
 [SkpNative]::EnumWindows({param($h,$l); [uint32]$pid=0; [SkpNative]::GetWindowThreadProcessId($h,[ref]$pid)|Out-Null; if($pid -eq $proc.Id){$sb=New-Object Text.StringBuilder 256; [SkpNative]::GetWindowText($h,$sb,256)|Out-Null; if($sb.ToString() -match 'Ruby'){ $script:ruby=$h; return $false }}; return $true},[IntPtr]::Zero)|Out-Null
 if($ruby -eq [IntPtr]::Zero){ return $false }
 $edits=New-Object System.Collections.ArrayList
 [SkpNative]::EnumChildWindows($ruby,{param($h,$l); $sb=New-Object Text.StringBuilder 128; [SkpNative]::GetClassName($h,$sb,128)|Out-Null; if($sb.ToString() -eq 'Edit'){[void]$edits.Add($h)}; return $true},[IntPtr]::Zero)|Out-Null
 if($edits.Count -lt 1){ return $false }
 $input=[IntPtr]$edits[0]
 $rubyOut=$outDir.Replace('\\','/').Replace("'","\\'")
 $rubyExporter=$Exporter.Replace('\\','/').Replace("'","\\'")
 $cmd="require '$rubyExporter'; FileUtils.mkdir_p('$rubyOut'); r=CentralSketchupLearning.export_current_model('$rubyOut'); File.open('$rubyOut/native_export_result.json','w:UTF-8'){|f| f.write(JSON.pretty_generate(r))}"
 [IntPtr]$res=[IntPtr]::Zero
 [SkpNative]::SendMessageTimeout($input,0x000C,[IntPtr]::Zero,$cmd,2,1000,[ref]$res)|Out-Null
 [SkpNative]::PostMessage($input,0x0100,[IntPtr]13,[IntPtr]::Zero)|Out-Null
 [SkpNative]::PostMessage($input,0x0102,[IntPtr]13,[IntPtr]::Zero)|Out-Null
 [SkpNative]::PostMessage($input,0x0101,[IntPtr]13,[IntPtr]::Zero)|Out-Null
 [SkpNative]::PostMessage($ruby,0x0100,[IntPtr]13,[IntPtr]::Zero)|Out-Null
 [SkpNative]::PostMessage($ruby,0x0101,[IntPtr]13,[IntPtr]::Zero)|Out-Null
 return $true
}
function Wait-ForFile($path,[int]$seconds){
 $until=(Get-Date).AddSeconds($seconds)
 do { Start-Sleep -Seconds 3; if(Test-Path $path){return $true} } while((Get-Date) -lt $until)
 return $false
}
function Get-SourceRootId($path){
 if($path.StartsWith('G:\내 드라이브\홈디자인',[StringComparison]::OrdinalIgnoreCase)){return '13jytaLEtyofBebT1qtJMpreNgWSsrIMQ'}
 if($path.StartsWith('G:\다른 컴퓨터\내 노트북\홈디자인',[StringComparison]::OrdinalIgnoreCase)){return '19uK6l77kv1U95saj2qVQjs10-xH_Wt4C'}
 return ''
}
$StageRoot='G:\내 드라이브\HomeDesign_Agent_Platform\04_MEDIA_FACTORY\06_RENDER_SKETCHUP'
$NativeStage=Join-Path $StageRoot '10_NATIVE_EXPORT'
$SeedStage=Join-Path $StageRoot '20_SEED_BUNDLE'
$ReceiptStage=Join-Path $StageRoot '90_RUNTIME_RECEIPT'
New-Item -ItemType Directory -Force -Path $NativeStage,$SeedStage,$ReceiptStage | Out-Null
$done=@{}
if(Test-Path $DoneFile){ Get-Content $DoneFile -ErrorAction SilentlyContinue | ForEach-Object { if($_){$done[$_]=1} } }
$inventory=@(Get-Content -Raw $InventoryFile | ConvertFrom-Json)
$candidates=@($inventory | Where-Object { !$done.ContainsKey([string]$_.key) } | Sort-Object rank,@{Expression='modified';Descending=$true},bytes)
$processed=0
foreach($item in $candidates){
 if($processed -ge $MaxModelsPerRun){break}
 if(!$ForceTest -and (!(Test-NightWindow) -or (Get-IdleSeconds) -lt 900 -or (Test-HeavyWork))){break}
 if(!(Test-Path $item.path)){ Write-RunLog ([ordered]@{event='MISSING';key=$item.key;path=$item.path}); continue }
 $taskId='TASK_SKP_NIGHT_'+$item.key.ToUpper()
 $outDir=Join-Path $ExportRoot $taskId
 New-Item -ItemType Directory -Force -Path $outDir | Out-Null
 $startup=Join-Path $StateRoot ($taskId+'_startup.rb')
 $outRuby=$outDir.Replace('\\','/').Replace("'","\\'")
 $expRuby=$Exporter.Replace('\\','/').Replace("'","\\'")
 @("require 'sketchup.rb'","require 'json'","require 'fileutils'","out='$outRuby'","FileUtils.mkdir_p(out)","File.write(File.join(out,'startup_loaded.txt'),'START '+Time.now.to_s)","require '$expRuby'","UI.start_timer(8.0,false){r=CentralSketchupLearning.export_current_model(out);File.open(File.join(out,'native_export_result.json'),'w:UTF-8'){|f|f.write(JSON.pretty_generate(r))}}") | Set-Content -Path $startup -Encoding UTF8
 Write-RunLog ([ordered]@{event='START';task=$taskId;path=$item.path;class=$item.class;bytes=$item.bytes})
 try {
   $args=@("`"$($item.path)`"",'-RubyStartup',"`"$startup`"")
   $proc=Start-Process -FilePath $SketchupExe -ArgumentList $args -PassThru
   $readyUntil=(Get-Date).AddSeconds(90)
   do { Start-Sleep -Seconds 2; $proc.Refresh() } while(!$proc.HasExited -and $proc.MainWindowHandle -eq 0 -and (Get-Date) -lt $readyUntil)
   $resultPath=Join-Path $outDir 'native_export_result.json'
   $nativeOk=Wait-ForFile $resultPath 120
   if(!$nativeOk -and !$proc.HasExited){
     $fallback=Invoke-SkpConsoleExport $proc $outDir
     Write-RunLog ([ordered]@{event='FALLBACK';task=$taskId;consoleInvoked=$fallback})
     if($fallback){$nativeOk=Wait-ForFile $resultPath 600}
   }
   if(!$nativeOk){ throw 'NATIVE_EXPORT_TIMEOUT' }
   $native=Get-Content -Raw $resultPath | ConvertFrom-Json
   if($native.ok -ne $true -or $native.geometry_qa.pass -ne $true){ throw ('NATIVE_GEOMETRY_QA_FAIL '+($native|ConvertTo-Json -Compress -Depth 6)) }
   & python $Builder (Join-Path $outDir 'model_manifest.json') --out $outDir | Out-Null
   $seedReceipt=Get-Content -Raw (Join-Path $outDir 'seed_builder_receipt.json') | ConvertFrom-Json
   if($seedReceipt.ok -ne $true){throw 'SEED_BUILDER_QA_FAIL'}
   if(!$proc.HasExited){ [void]$proc.CloseMainWindow(); Start-Sleep -Seconds 5; if(!$proc.HasExited){$proc.Kill()} }
 } catch {
   if($proc -and !$proc.HasExited){try{$proc.Kill()}catch{}}
   Write-RunLog ([ordered]@{event='FAIL';task=$taskId;path=$item.path;error=$_.Exception.Message})
   continue
 }
 $manifestName='SKP_MANIFEST_'+$taskId+'.json'
 $seedName='SKP_SEED_BUNDLE_'+$taskId+'.json'
 $templateName='SKP_TEMPLATE_PAYLOAD_'+$taskId+'.json'
 Copy-Item (Join-Path $outDir 'model_manifest.json') (Join-Path $NativeStage $manifestName) -Force
 Copy-Item (Join-Path $outDir 'seed_bundle.json') (Join-Path $SeedStage $seedName) -Force
 Copy-Item (Join-Path $outDir 'template_payload.json') (Join-Path $SeedStage $templateName) -Force
 $manifestHash=(Get-FileHash (Join-Path $outDir 'model_manifest.json') -Algorithm SHA256).Hash.ToLower()
 $seedHash=(Get-FileHash (Join-Path $outDir 'seed_bundle.json') -Algorithm SHA256).Hash.ToLower()
 $templateHash=(Get-FileHash (Join-Path $outDir 'template_payload.json') -Algorithm SHA256).Hash.ToLower()
 $receipt=[ordered]@{
   schema_version='SKP_LOCAL_RESULT_RECEIPT_V2_NATIVE';run_id=('SKP_NIGHT_'+(Get-Date -Format 'yyyyMMdd_HHmmss')+'_'+$item.key);task_id=$taskId
   file_id='LOCAL_PENDING_RESOLVE';source_file_name=$item.name;source_size=[int64]$item.bytes;source_modified=$item.modified;source_root_id=(Get-SourceRootId $item.path);source_path=$item.path
   model_id=$seedReceipt.model_id;project_id='P06_HOMEDESIGN';canonical_group='NATIVE_SKETCHUP_NIGHT_CORPUS';version_role='AUTHORITATIVE_NATIVE_GEOMETRY'
   skp_runtime='SketchUp 2022 22.0.354';exporter_version=$native.exporter_version;builder_version=$seedReceipt.builder_version
   manifest_file_name=$manifestName;seed_bundle_file_name=$seedName;template_payload_file_name=$templateName
   input_hash=$item.key.ToLower();manifest_hash=$manifestHash;seed_hash=$seedHash;template_hash=$templateHash
   result_id=('RESULT_SKP_NIGHT_'+$manifestHash.Substring(0,16).ToUpper());ack_id=('ACK_SKP_NIGHT_'+$seedHash.Substring(0,16).ToUpper());retry_count=0
   ok=$true;final_qa_pass=$true;drive_readback_x2=$false;local_mount_readback=$true;provider_readback_pending=$true
   geometry_extracted=$true;dimensions_extracted=$true;seed_count=[int]$seedReceipt.seed_count;created_at=(Get-Date).ToString('o')
 }
 $receiptName='SKP_RECEIPT_'+$taskId+'.json'
 $receiptPath=Join-Path $ReceiptStage $receiptName
 $receipt | ConvertTo-Json -Depth 8 | Set-Content -Path $receiptPath -Encoding UTF8
 if(!(Test-Path (Join-Path $NativeStage $manifestName)) -or !(Test-Path (Join-Path $SeedStage $seedName)) -or !(Test-Path $receiptPath)){throw 'LOCAL_DRIVE_STAGE_READBACK_FAIL'}
 Add-Content -Path $DoneFile -Value $item.key -Encoding ASCII
 $processed++
 Write-RunLog ([ordered]@{event='PASS';task=$taskId;path=$item.path;modelId=$seedReceipt.model_id;seedCount=$seedReceipt.seed_count;geometryPass=$native.geometry_qa.pass;localDriveReadback=$true;providerReadback='PENDING_APPS_SCRIPT'})
}
Write-Output "NIGHT_SKP_RUN_COMPLETE processed=$processed remaining=$($candidates.Count-$processed)"
