param(
  [ValidateSet('ReadOnly','Apply')][string]$Mode='ReadOnly',
  [string]$ApprovalReceipt='',
  [string]$ExpectedBaselineSha256='',
  [string]$ReceiptRoot=''
)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest

$Version='P0_07_TASK203_CURRENT_FACTORY_V1_2_20260916'
$FactoryScriptId='1DzJwRMdmdxv2CUdizopRr5qt_IqxvNlrPq6COIDQ6coGRvZOS5cvdxeL'
$ExistingTriggerUid='486210864358096896'
$RequiredApproval='GRANTED_PHYSICAL_MOBILE_20260916'
$ExpectedRepo='8friend8ship-cloud/Analyzer-12.09'
$ExpectedBranch='main'
$RepoRoot=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$ManifestPath=Join-Path $PSScriptRoot 'task203_current_factory_p007_manifest.json'
if(!(Test-Path $ManifestPath)){ throw 'MANIFEST_MISSING' }
$Manifest=Get-Content -Raw -Encoding UTF8 $ManifestPath | ConvertFrom-Json
if([string]$Manifest.factoryScriptId -ne $FactoryScriptId){ throw 'MANIFEST_FACTORY_ID_MISMATCH' }
if([string]$Manifest.existingProcessAllTaskQueuesTriggerUid -ne $ExistingTriggerUid){ throw 'MANIFEST_TRIGGER_UID_MISMATCH' }
if([string]$Manifest.approvalReceipt -ne $RequiredApproval){ throw 'MANIFEST_APPROVAL_RECEIPT_MISMATCH' }
if([string]$Manifest.sourceRepo -ne $ExpectedRepo){ throw 'MANIFEST_SOURCE_REPO_MISMATCH' }
if([string]$Manifest.sourceBranch -ne $ExpectedBranch){ throw 'MANIFEST_SOURCE_BRANCH_MISMATCH' }

if([string]::IsNullOrWhiteSpace($ReceiptRoot)){
  $ReceiptRoot=Join-Path $env:USERPROFILE 'Documents\CentralSharedOwnerCanonical_1DzJw\Runtime_Readback'
}
New-Item -ItemType Directory -Force -Path $ReceiptRoot | Out-Null
$Stamp=Get-Date -Format 'yyyyMMdd_HHmmss'
$RunId="P007_TASK203_$Stamp"
$CloneRoot=Join-Path $env:TEMP ($RunId+'_clone')
$VerifyRoot=Join-Path $env:TEMP ($RunId+'_verify')
New-Item -ItemType Directory -Force -Path $CloneRoot | Out-Null

function Resolve-Clasp {
  $fixed='C:\Users\User\AppData\Roaming\npm\clasp.cmd'
  if(Test-Path $fixed){ return $fixed }
  $cmd=Get-Command clasp.cmd -ErrorAction SilentlyContinue
  if($cmd){ return $cmd.Source }
  throw 'CLASP_CMD_NOT_FOUND'
}
function Get-AggregateSha([string]$Root){
  $files=Get-ChildItem -Path $Root -File -Recurse | Where-Object { $_.Name -ne '.clasp.json' -and $_.Extension -in @('.js','.gs','.json') } | Sort-Object FullName
  $parts=foreach($f in $files){
    $rel=$f.FullName.Substring($Root.Length).TrimStart('\')
    $sha=(Get-FileHash -Algorithm SHA256 -Path $f.FullName).Hash.ToLowerInvariant()
    "$rel|$sha|$($f.Length)"
  }
  $joined=($parts -join "`n")
  $bytes=[Text.Encoding]::UTF8.GetBytes($joined)
  $sha256=[Security.Cryptography.SHA256]::Create()
  try { ([BitConverter]::ToString($sha256.ComputeHash($bytes))).Replace('-','').ToLowerInvariant() } finally { $sha256.Dispose() }
}
function Get-GitBlobSha([string]$Path){
  $git=Get-Command git.exe -ErrorAction SilentlyContinue
  if(!$git){ throw 'GIT_EXE_NOT_FOUND' }
  $out=& $git.Source hash-object -- $Path 2>$null
  if($LASTEXITCODE -ne 0){ throw ('GIT_HASH_OBJECT_FAILED:'+ $Path) }
  $blob=([string]$out).Trim().ToLowerInvariant()
  if([string]::IsNullOrWhiteSpace($blob)){ throw ('GIT_BLOB_SHA_EMPTY:'+ $Path) }
  return $blob
}
function Get-FunctionOwners([string]$Root,[string]$Fn){
  $rx='(?m)^\s*function\s+'+[regex]::Escape($Fn)+'\s*\('
  @(Get-ChildItem -Path $Root -File -Recurse | Where-Object { $_.Extension -in @('.js','.gs') } | Where-Object { (Get-Content -Raw -Encoding UTF8 $_.FullName) -match $rx } | ForEach-Object { $_.FullName })
}
function Invoke-ClaspClone([string]$Clasp,[string]$Root){
  Push-Location $Root
  try {
    $output=& $Clasp clone $FactoryScriptId 2>&1
    $exit=$LASTEXITCODE
    return [pscustomobject]@{exit=$exit;output=($output -join "`n")}
  } finally { Pop-Location }
}
function Write-Receipt($obj){
  $path=Join-Path $ReceiptRoot ($RunId+'.json')
  $obj | ConvertTo-Json -Depth 12 | Set-Content -Encoding UTF8 -Path $path
  Write-Output $path
}

$receipt=[ordered]@{
  ok=$false; action='P0_07_TASK203_CURRENT_FACTORY'; version=$Version; runId=$RunId; mode=$Mode;
  factoryScriptId=$FactoryScriptId; expectedTriggerUid=$ExistingTriggerUid; sourceRepo=$ExpectedRepo; sourceBranch=$ExpectedBranch;
  readOnly=($Mode -eq 'ReadOnly'); safeToPush=$false; pushPerformed=$false; newOAuth=$false; newProject=$false; newDeployment=$false; newTrigger=$false; triggerTouched=$false;
  startedAt=(Get-Date).ToString('o')
}
try {
  $clasp=Resolve-Clasp
  $receipt.claspPath=$clasp
  $clone=Invoke-ClaspClone $clasp $CloneRoot
  $receipt.cloneExit=$clone.exit
  $receipt.cloneOutput=$clone.output
  if($clone.exit -ne 0){ throw 'CURRENT_FACTORY_CLONE_FAILED' }
  $claspJson=Join-Path $CloneRoot '.clasp.json'
  if(!(Test-Path $claspJson)){ throw 'CLASP_JSON_MISSING_AFTER_CLONE' }
  $cj=Get-Content -Raw -Encoding UTF8 $claspJson | ConvertFrom-Json
  if([string]$cj.scriptId -ne $FactoryScriptId){ throw 'CLONED_OWNER_MISMATCH' }

  $baselineFiles=@(Get-ChildItem -Path $CloneRoot -File | Where-Object { $_.Extension -in @('.js','.gs','.json') })
  if($baselineFiles.Count -lt 1){ throw 'EMPTY_CURRENT_FACTORY_BASELINE' }
  $baselineSha=Get-AggregateSha $CloneRoot
  $receipt.baselineFileCount=$baselineFiles.Count
  $receipt.baselineSha256=$baselineSha
  $receipt.baselineUnchanged=$true

  $bundle=@()
  foreach($sf in $Manifest.sourceFiles){
    $path=Join-Path $RepoRoot ([string]$sf.path).Replace('/','\')
    if(!(Test-Path $path)){ throw ('SOURCE_BUNDLE_MISSING:'+([string]$sf.path)) }
    $actualBlob=Get-GitBlobSha $path
    if($actualBlob -ne ([string]$sf.gitBlobSha).ToLowerInvariant()){
      throw ('SOURCE_GIT_BLOB_MISMATCH:'+([string]$sf.path)+':'+$actualBlob)
    }
    $owners=Get-FunctionOwners $CloneRoot ([string]$sf.requiredFunction)
    $bundle += [pscustomobject]@{
      path=[string]$sf.path; file=(Split-Path $path -Leaf); requiredFunction=[string]$sf.requiredFunction;
      expectedGitBlob=[string]$sf.gitBlobSha; actualGitBlob=$actualBlob;
      sha256=(Get-FileHash -Algorithm SHA256 -Path $path).Hash.ToLowerInvariant(); bytes=(Get-Item $path).Length;
      existingFunctionOwners=$owners
    }
  }
  $receipt.sourceBundle=$bundle
  $receipt.sourceBundleCount=$bundle.Count
  if($bundle.Count -ne $Manifest.sourceFiles.Count){ throw 'SOURCE_BUNDLE_COUNT_MISMATCH' }

  $collision=@()
  foreach($b in $bundle){
    foreach($owner in $b.existingFunctionOwners){
      $expectedStem=[IO.Path]::GetFileNameWithoutExtension($b.file)
      $ownerStem=[IO.Path]::GetFileNameWithoutExtension($owner)
      if($ownerStem -ne $expectedStem){ $collision += [pscustomobject]@{function=$b.requiredFunction;owner=$owner;expectedStem=$expectedStem} }
    }
  }
  $receipt.entrypointCollisions=$collision
  if($collision.Count -gt 0){ throw 'ENTRYPOINT_COLLISION_FAIL_CLOSED' }

  $receipt.safeToPush=($baselineFiles.Count -gt 0 -and $bundle.Count -eq $Manifest.sourceFiles.Count -and $collision.Count -eq 0)
  if($Mode -eq 'ReadOnly'){
    $receipt.ok=$receipt.safeToPush
    $receipt.stage=if($receipt.safeToPush){'READONLY_BASELINE_SOURCE_GATE_PASS'}else{'READONLY_GATE_HOLD'}
    $receipt.nextAction='Apply only with exact baselineSha256 + granted approval receipt; preserve existing trigger UID; no OAuth/project/deployment/trigger mutation.'
  } else {
    if($ApprovalReceipt -ne $RequiredApproval){ throw 'APPROVAL_RECEIPT_REQUIRED' }
    if([string]::IsNullOrWhiteSpace($ExpectedBaselineSha256)){ throw 'EXPECTED_BASELINE_SHA_REQUIRED' }
    if($ExpectedBaselineSha256.ToLowerInvariant() -ne $baselineSha){ throw 'BASELINE_CHANGED_ABORT' }
    if(!$receipt.safeToPush){ throw 'SAFE_TO_PUSH_FALSE' }

    foreach($b in $bundle){
      $src=Join-Path $RepoRoot ([string]$b.path).Replace('/','\')
      $stem=[IO.Path]::GetFileNameWithoutExtension($src)
      $existing=@(Get-ChildItem -Path $CloneRoot -File | Where-Object { [IO.Path]::GetFileNameWithoutExtension($_.Name) -eq $stem })
      foreach($e in $existing){ Remove-Item -Force $e.FullName }
      Copy-Item -Force $src (Join-Path $CloneRoot ([IO.Path]::GetFileName($src)) )
    }
    Push-Location $CloneRoot
    try {
      $pushOut=& $clasp push -f 2>&1
      $receipt.pushExit=$LASTEXITCODE
      $receipt.pushOutput=($pushOut -join "`n")
    } finally { Pop-Location }
    if($receipt.pushExit -ne 0){ throw 'CLASP_PUSH_FAILED' }
    $receipt.pushPerformed=$true

    New-Item -ItemType Directory -Force -Path $VerifyRoot | Out-Null
    $verify=Invoke-ClaspClone $clasp $VerifyRoot
    $receipt.verifyCloneExit=$verify.exit
    if($verify.exit -ne 0){ throw 'POST_PUSH_RECLONE_FAILED' }
    $post=@()
    foreach($sf in $Manifest.sourceFiles){
      $owners=Get-FunctionOwners $VerifyRoot ([string]$sf.requiredFunction)
      $post += [pscustomobject]@{function=[string]$sf.requiredFunction;owners=$owners;count=$owners.Count}
      if($owners.Count -ne 1){ throw ('POST_PUSH_FUNCTION_COUNT_FAIL:'+([string]$sf.requiredFunction)) }
    }
    $receipt.postPushFunctions=$post
    $receipt.postPushAggregateSha256=Get-AggregateSha $VerifyRoot
    $receipt.ok=$true
    $receipt.stage='SAME_OWNER_SOURCE_SYNC_READBACK_PASS'
    $receipt.nextAction='Do not touch trigger. Wait for existing processAllTaskQueues natural wakes and require DRIVEINTAKE4 distinct x2 + 07/08/80/93.'
  }
} catch {
  $receipt.ok=$false
  $receipt.stage='ERROR'
  $receipt.error=$_.Exception.Message
} finally {
  $receipt.completedAt=(Get-Date).ToString('o')
  $path=Write-Receipt $receipt
  Write-Output ($receipt | ConvertTo-Json -Compress -Depth 8)
  Write-Output ('RECEIPT='+$path)
}
if(!$receipt.ok){ exit 2 }
exit 0
