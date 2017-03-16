#Requires -RunAsAdministrator
New-Item -Path HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.pbfy0.gst_embed\ -value (Join-Path (pwd) manifest.json)