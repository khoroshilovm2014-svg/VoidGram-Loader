import AppKit
import CoreGraphics

let output = CommandLine.arguments[1]
let image = NSImage(size: NSSize(width: 1024, height: 1024))
image.lockFocus()
guard let ctx = NSGraphicsContext.current?.cgContext else { fatalError("No graphics context") }
ctx.setAllowsAntialiasing(true)
ctx.setShouldAntialias(true)
let colors = [CGColor(red: 0.025, green: 0.045, blue: 0.105, alpha: 1), CGColor(red: 0.035, green: 0.105, blue: 0.22, alpha: 1)] as CFArray
let gradient = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(), colors: colors, locations: [0, 1])!
ctx.drawLinearGradient(gradient, start: CGPoint(x: 0, y: 1024), end: CGPoint(x: 1024, y: 0), options: [])
ctx.setFillColor(NSColor(calibratedRed: 0.08, green: 0.42, blue: 1, alpha: 0.16).cgColor)
ctx.fillEllipse(in: CGRect(x: 190, y: 190, width: 644, height: 644))
let path = CGMutablePath()
path.move(to: CGPoint(x: 300, y: 270)); path.addLine(to: CGPoint(x: 300, y: 754))
path.addLine(to: CGPoint(x: 724, y: 270)); path.addLine(to: CGPoint(x: 724, y: 754))
ctx.addPath(path)
ctx.setStrokeColor(NSColor(calibratedRed: 0.28, green: 0.64, blue: 1, alpha: 1).cgColor)
ctx.setLineWidth(92); ctx.setLineCap(.round); ctx.setLineJoin(.round); ctx.strokePath()
ctx.setFillColor(NSColor(calibratedRed: 0.35, green: 0.82, blue: 1, alpha: 1).cgColor)
ctx.fillEllipse(in: CGRect(x: 440, y: 440, width: 144, height: 144))
image.unlockFocus()
guard let tiff = image.tiffRepresentation, let bitmap = NSBitmapImageRep(data: tiff), let png = bitmap.representation(using: .png, properties: [:]) else { fatalError("PNG encoding failed") }
try png.write(to: URL(fileURLWithPath: output))
print("Generated NovaStore icon at \(output)")
