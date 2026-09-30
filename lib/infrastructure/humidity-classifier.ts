import type { WasteClassifier } from '@/lib/domain/repositories'
import type { WasteCategory, WasteReading } from '@/lib/domain/entities'

export class HumidityThresholdClassifier implements WasteClassifier {
  constructor(private readonly threshold: number = 50) {}

  classify(reading: WasteReading): WasteCategory {
    return reading.humidity >= this.threshold ? 'humedo' : 'seco'
  }
}
