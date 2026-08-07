import { execFileSync } from "node:child_process";

type NativeDialogOptions = {
  message: string;
  title: string;
  primaryLabel: string;
  secondaryLabel: string;
  icon?: "note" | "caution";
};

function powershellString(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

export function showNativeChoiceDialog(options: NativeDialogOptions) {
  if (process.platform === "win32") {
    const script = [
      "$ErrorActionPreference = 'Stop'",
      "Add-Type -AssemblyName System.Windows.Forms",
      "Add-Type -AssemblyName System.Drawing",
      "$form = New-Object System.Windows.Forms.Form",
      `$form.Text = ${powershellString(options.title)}`,
      "$form.StartPosition = 'CenterScreen'",
      "$form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::FixedDialog",
      "$form.MinimizeBox = $false",
      "$form.MaximizeBox = $false",
      "$form.ShowInTaskbar = $false",
      "$form.ClientSize = New-Object System.Drawing.Size(480, 180)",
      "$label = New-Object System.Windows.Forms.Label",
      `$label.Text = ${powershellString(options.message)}`,
      "$label.Location = New-Object System.Drawing.Point(20, 20)",
      "$label.Size = New-Object System.Drawing.Size(440, 85)",
      "$label.TextAlign = [System.Drawing.ContentAlignment]::MiddleLeft",
      "$secondary = New-Object System.Windows.Forms.Button",
      `$secondary.Text = ${powershellString(options.secondaryLabel)}`,
      "$secondary.Location = New-Object System.Drawing.Point(266, 125)",
      "$secondary.Size = New-Object System.Drawing.Size(96, 30)",
      "$secondary.DialogResult = [System.Windows.Forms.DialogResult]::No",
      "$primary = New-Object System.Windows.Forms.Button",
      `$primary.Text = ${powershellString(options.primaryLabel)}`,
      "$primary.Location = New-Object System.Drawing.Point(370, 125)",
      "$primary.Size = New-Object System.Drawing.Size(96, 30)",
      "$primary.DialogResult = [System.Windows.Forms.DialogResult]::Yes",
      "$form.Controls.Add($label)",
      "$form.Controls.Add($secondary)",
      "$form.Controls.Add($primary)",
      "$form.AcceptButton = $primary",
      "$form.CancelButton = $secondary",
      "$result = $form.ShowDialog()",
      "if ($result -eq [System.Windows.Forms.DialogResult]::Yes) { Write-Output 'yes' } else { Write-Output 'no' }",
    ].join("; ");
    const output = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-STA", "-Command", script], { encoding: "utf8", windowsHide: true }).trim();
    return output === "yes";
  }
  if (process.platform === "darwin") {
    try {
      const primary = JSON.stringify(options.primaryLabel);
      const secondary = JSON.stringify(options.secondaryLabel);
      const output = execFileSync("/usr/bin/osascript", ["-e", `display dialog ${JSON.stringify(options.message)} with title ${JSON.stringify(options.title)} buttons {${secondary}, ${primary}} default button ${primary} cancel button ${secondary} with icon ${options.icon ?? "note"}`], { encoding: "utf8" }).trim();
      return output.includes(`button returned:${options.primaryLabel}`);
    } catch {
      return false;
    }
  }
  return false;
}
