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
      "[System.Windows.Forms.Application]::EnableVisualStyles()",
      "$message = " + powershellString(options.message),
      "$parts = @($message -split '(?:\r?\n){2,}', 2)",
      "$heading = if ($parts.Count -gt 1) { $parts[1].Trim() } else { $message.Trim() }",
      "$detail = if ($parts.Count -gt 1) { $parts[0].Trim() } else { '' }",
      "$form = New-Object System.Windows.Forms.Form",
      `$form.Text = ${powershellString(options.title)}`,
      "$form.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen",
      "$form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::FixedDialog",
      "$form.ControlBox = $true",
      "$form.MinimizeBox = $false",
      "$form.MaximizeBox = $false",
      "$form.ShowIcon = $false",
      "$form.ShowInTaskbar = $false",
      "$form.AutoScaleMode = [System.Windows.Forms.AutoScaleMode]::Dpi",
      "$form.ClientSize = [System.Drawing.Size]::new(460, 160)",
      "$form.BackColor = [System.Drawing.SystemColors]::Control",
      "$form.Font = [System.Drawing.SystemFonts]::MessageBoxFont",
      `$form.AccessibleName = ${powershellString(options.title)}`,
      "$headingLabel = New-Object System.Windows.Forms.Label",
      "$headingLabel.Text = $heading",
      "$headingLabel.Location = [System.Drawing.Point]::new(24, 22)",
      "$headingLabel.Size = [System.Drawing.Size]::new(412, 24)",
      "$headingLabel.Font = [System.Drawing.Font]::new($form.Font, [System.Drawing.FontStyle]::Bold)",
      "$headingLabel.TextAlign = [System.Drawing.ContentAlignment]::MiddleLeft",
      "$headingLabel.AccessibleName = $heading",
      "$detailLabel = New-Object System.Windows.Forms.Label",
      "$detailLabel.Text = $detail",
      "$detailLabel.Location = [System.Drawing.Point]::new(24, 52)",
      "$detailLabel.Size = [System.Drawing.Size]::new(412, 34)",
      "$detailLabel.TextAlign = [System.Drawing.ContentAlignment]::TopLeft",
      "$detailLabel.AccessibleName = $detail",
      "$secondary = New-Object System.Windows.Forms.Button",
      `$secondary.Text = ${powershellString(options.secondaryLabel)}`,
      "$secondary.Location = [System.Drawing.Point]::new(252, 110)",
      "$secondary.Size = [System.Drawing.Size]::new(88, 29)",
      "$secondary.FlatStyle = [System.Windows.Forms.FlatStyle]::System",
      "$secondary.UseVisualStyleBackColor = $true",
      `$secondary.AccessibleName = ${powershellString(options.secondaryLabel)}`,
      "$secondary.TabIndex = 0",
      "$secondary.DialogResult = [System.Windows.Forms.DialogResult]::No",
      "$primary = New-Object System.Windows.Forms.Button",
      `$primary.Text = ${powershellString(options.primaryLabel)}`,
      "$primary.Location = [System.Drawing.Point]::new(348, 110)",
      "$primary.Size = [System.Drawing.Size]::new(88, 29)",
      "$primary.FlatStyle = [System.Windows.Forms.FlatStyle]::System",
      "$primary.UseVisualStyleBackColor = $true",
      `$primary.AccessibleName = ${powershellString(options.primaryLabel)}`,
      "$primary.TabIndex = 1",
      "$primary.DialogResult = [System.Windows.Forms.DialogResult]::Yes",
      "$form.Controls.Add($headingLabel)",
      "$form.Controls.Add($detailLabel)",
      "$form.Controls.Add($secondary)",
      "$form.Controls.Add($primary)",
      "$form.AcceptButton = $primary",
      "$form.CancelButton = $secondary",
      "$form.Add_Shown({ [void]$secondary.Focus() })",
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
