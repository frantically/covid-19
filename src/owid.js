const COUNTRY_SWITZERLAND = "Switzerland"
export const TOTAL = "total_vaccinations"
export const PEOPLE_VACCINATED = "people_vaccinated"
export const PEOPLE_FULLY_VACCINATED = "people_fully_vaccinated"


export class OWIDCoronaStatistics {

    _data = []
    _locationConfig = {}

    constructor(sourceData, locationConfig) {
        this._data = sourceData.filter(s => s.location === COUNTRY_SWITZERLAND).map(this._converter).filter(s => s.date) //filter out last empty row in data
        this._locationConfig = locationConfig
    }

    _converter(source) {
        return {
            key: `${source.location}_${source.date}`,
            location: 'CH',
            date: Date.parse(source.date),
            total_vaccinations: parseFloat(source[TOTAL]),
            people_vaccinated: parseFloat(source[PEOPLE_VACCINATED]),
            people_fully_vaccinated: parseFloat(source[PEOPLE_FULLY_VACCINATED])
        }
    }
    
    getSeriesPercentOfPopulation(key) {
        return this._data.filter(s => s[key]).map(sample => {return {x: sample.date, y: 100*(sample[key]/this._locationConfig.CH.population)}})
    }
}