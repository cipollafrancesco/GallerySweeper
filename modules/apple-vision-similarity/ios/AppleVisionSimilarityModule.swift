import ExpoModulesCore
import Vision

/**
 * Thin wrapper around Apple Vision's image feature print — the same on-device
 * primitive the Photos app uses for its "Duplicates" album. Everything runs on
 * the Neural Engine; no image data leaves the device.
 */
public class AppleVisionSimilarityModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AppleVisionSimilarity")

    // Computes the feature-print vector for the image at `uri` (a file:// URL).
    AsyncFunction("featurePrint") { (uri: String) -> [Float] in
      guard let url = URL(string: uri) else {
        throw InvalidUriException(uri)
      }

      let handler = VNImageRequestHandler(url: url, options: [:])
      let request = VNGenerateImageFeaturePrintRequest()
      try handler.perform([request])

      guard let observation = request.results?.first as? VNFeaturePrintObservation else {
        throw NoFeaturePrintException()
      }

      // VNFeaturePrintObservation.data holds `elementCount` Float32 values.
      let count = observation.elementCount
      var floats = [Float](repeating: 0, count: count)
      let data = observation.data
      let copied = floats.withUnsafeMutableBytes { buffer in
        data.copyBytes(to: buffer)
      }
      guard copied == count * MemoryLayout<Float>.stride else {
        throw FeaturePrintDecodeException()
      }
      return floats
    }
  }
}

private class InvalidUriException: Exception {
  private let uri: String
  init(_ uri: String) {
    self.uri = uri
    super.init()
  }
  override var reason: String {
    "Invalid image URI: \(uri)"
  }
}

private class NoFeaturePrintException: Exception {
  override var reason: String {
    "Vision returned no feature print for the image"
  }
}

private class FeaturePrintDecodeException: Exception {
  override var reason: String {
    "Feature print element type was not Float32 as expected"
  }
}
