import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appIconIcns, appIconIco } from "./brand-assets.js";

export type NativeDialogChoice = "primary" | "secondary" | "cancelled";

type NativeDialogOptions = {
  message: string;
  title: string;
  primaryLabel: string;
  secondaryLabel: string;
};

function powershellString(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

export function showNativeChoiceDialog(options: NativeDialogOptions) {
  const assetDirectory = mkdtempSync(join(tmpdir(), "better-codex-dialog-"));
  try {
    if (process.platform === "win32") {
      const iconPath = join(assetDirectory, "AppIcon.ico");
      writeFileSync(iconPath, appIconIco());
      const script = [
        "$ErrorActionPreference = 'Stop'",
        "Add-Type -AssemblyName System.Windows.Forms",
        "Add-Type -AssemblyName System.Drawing",
        "[System.Windows.Forms.Application]::EnableVisualStyles()",
        "$message = " + powershellString(options.message),
        "$parts = @($message -split '(?:\r?\n){2,}', 2)",
        "$heading = if ($parts.Count -gt 1) { $parts[1].Trim() } else { $message.Trim() }",
        "$detail = if ($parts.Count -gt 1) { $parts[0].Trim() } else { '' }",
        `$dialogIcon = [System.Drawing.Icon]::new(${powershellString(iconPath)})`,
        "$form = New-Object System.Windows.Forms.Form",
        `$form.Text = ${powershellString(options.title)}`,
        "$form.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen",
        "$form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::FixedDialog",
        "$form.ControlBox = $true",
        "$form.MinimizeBox = $false",
        "$form.MaximizeBox = $false",
        "$form.Icon = $dialogIcon",
        "$form.ShowIcon = $true",
        "$form.ShowInTaskbar = $false",
        "$form.AutoScaleMode = [System.Windows.Forms.AutoScaleMode]::Dpi",
        "$form.ClientSize = [System.Drawing.Size]::new(500, 176)",
        "$form.BackColor = [System.Drawing.SystemColors]::Control",
        "$form.Font = [System.Drawing.SystemFonts]::MessageBoxFont",
        `$form.AccessibleName = ${powershellString(options.title)}`,
        "$headingLabel = New-Object System.Windows.Forms.Label",
        "$headingLabel.Text = $heading",
        "$headingLabel.Location = [System.Drawing.Point]::new(24, 22)",
        "$headingLabel.Size = [System.Drawing.Size]::new(452, 24)",
        "$headingLabel.Font = [System.Drawing.Font]::new($form.Font, [System.Drawing.FontStyle]::Bold)",
        "$headingLabel.TextAlign = [System.Drawing.ContentAlignment]::MiddleLeft",
        "$headingLabel.AccessibleName = $heading",
        "$detailLabel = New-Object System.Windows.Forms.Label",
        "$detailLabel.Text = $detail",
        "$detailLabel.Location = [System.Drawing.Point]::new(24, 54)",
        "$detailLabel.Size = [System.Drawing.Size]::new(452, 48)",
        "$detailLabel.TextAlign = [System.Drawing.ContentAlignment]::TopLeft",
        "$detailLabel.AccessibleName = $detail",
        "$secondary = New-Object System.Windows.Forms.Button",
        `$secondary.Text = ${powershellString(options.secondaryLabel)}`,
        "$secondary.Location = [System.Drawing.Point]::new(236, 128)",
        "$secondary.Size = [System.Drawing.Size]::new(120, 29)",
        "$secondary.FlatStyle = [System.Windows.Forms.FlatStyle]::System",
        "$secondary.UseVisualStyleBackColor = $true",
        `$secondary.AccessibleName = ${powershellString(options.secondaryLabel)}`,
        "$secondary.TabIndex = 0",
        "$secondary.DialogResult = [System.Windows.Forms.DialogResult]::No",
        "$primary = New-Object System.Windows.Forms.Button",
        `$primary.Text = ${powershellString(options.primaryLabel)}`,
        "$primary.Location = [System.Drawing.Point]::new(364, 128)",
        "$primary.Size = [System.Drawing.Size]::new(120, 29)",
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
        "$form.Add_Shown({ [void]$secondary.Focus() })",
        "$result = $form.ShowDialog()",
        "$dialogIcon.Dispose()",
        "if ($result -eq [System.Windows.Forms.DialogResult]::Yes) { Write-Output 'primary' } elseif ($result -eq [System.Windows.Forms.DialogResult]::No) { Write-Output 'secondary' } else { Write-Output 'cancelled' }",
      ].join("; ");
      const output = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-STA", "-Command", script], { encoding: "utf8", windowsHide: true }).trim();
      return (["primary", "secondary"] as const).includes(output as "primary" | "secondary") ? output as NativeDialogChoice : "cancelled";
    }
    if (process.platform === "darwin") {
      const iconPath = join(assetDirectory, "AppIcon.icns");
      writeFileSync(iconPath, appIconIcns());
      const primary = JSON.stringify(options.primaryLabel);
      const secondary = JSON.stringify(options.secondaryLabel);
      const output = execFileSync("/usr/bin/osascript", ["-e", `display dialog ${JSON.stringify(options.message)} with title ${JSON.stringify(options.title)} buttons {${secondary}, ${primary}} default button ${secondary} with icon (POSIX file ${JSON.stringify(iconPath)})`], { encoding: "utf8" }).trim();
      if (output.includes(`button returned:${options.primaryLabel}`)) return "primary";
      if (output.includes(`button returned:${options.secondaryLabel}`)) return "secondary";
    }
  } catch {
    return "cancelled";
  } finally {
    rmSync(assetDirectory, { recursive: true, force: true });
  }
  return "cancelled";
}
