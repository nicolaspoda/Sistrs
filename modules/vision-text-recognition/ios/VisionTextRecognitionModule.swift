import ExpoModulesCore
import Vision
import UIKit

// Module Expo natif qui fait de l'OCR localement via le framework Vision
// d'Apple (VNRecognizeTextRequest). Remplace @react-native-ml-kit/text-recognition,
// qui ne fonctionne que sur device physique (voir discussion du 2026-10-13 :
// MLKit ne supporte pas le simulateur iOS, Apple Silicon ou non). Vision
// fonctionne nativement sur device ET simulateur (arm64 et x86_64).
public class VisionTextRecognitionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("VisionTextRecognition")

    AsyncFunction("recognizeText") { (uriString: String, promise: Promise) in
      guard let url = URL(string: uriString) else {
        promise.reject("E_INVALID_URI", "URI invalide: \(uriString)")
        return
      }

      DispatchQueue.global(qos: .userInitiated).async {
        do {
          let data = try Data(contentsOf: url)
          guard let image = UIImage(data: data), let cgImage = image.cgImage else {
            DispatchQueue.main.async {
              promise.reject("E_INVALID_IMAGE", "Impossible de décoder l'image depuis l'URI fournie")
            }
            return
          }

          let requestHandler = VNImageRequestHandler(
            cgImage: cgImage,
            orientation: image.imageOrientation.cgImagePropertyOrientation
          )

          let request = VNRecognizeTextRequest { request, error in
            if let error = error {
              DispatchQueue.main.async {
                promise.reject("E_VISION_FAILED", error.localizedDescription)
              }
              return
            }

            let observations = request.results as? [VNRecognizedTextObservation] ?? []
            let lines = observations.compactMap { $0.topCandidates(1).first?.string }
            let text = lines.joined(separator: "\n")

            DispatchQueue.main.async {
              promise.resolve(text)
            }
          }

          request.recognitionLevel = .accurate
          request.usesLanguageCorrection = true
          request.recognitionLanguages = ["fr-FR", "en-US"]

          try requestHandler.perform([request])
        } catch {
          DispatchQueue.main.async {
            promise.reject("E_READ_FAILED", error.localizedDescription)
          }
        }
      }
    }
  }
}

private extension UIImage.Orientation {
  var cgImagePropertyOrientation: CGImagePropertyOrientation {
    switch self {
    case .up: return .up
    case .down: return .down
    case .left: return .left
    case .right: return .right
    case .upMirrored: return .upMirrored
    case .downMirrored: return .downMirrored
    case .leftMirrored: return .leftMirrored
    case .rightMirrored: return .rightMirrored
    @unknown default: return .up
    }
  }
}
