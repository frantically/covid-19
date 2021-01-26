const COUNTRY_SWITZERLAND = "Switzerland"
export const VACCINATIONS_PER_HUNDRED = "total_vaccinations_per_hundred"

export class OWIDCoronaStatistics {

    _data = []

    constructor(sourceData) {
        this._data = sourceData.filter(s => s.location === COUNTRY_SWITZERLAND).map(this._converter).filter(s => s.date) //filter out last empty row in data
        console.log(this._data)
    }

    _converter(source) {
        return {
            key: `${source.location}_${source.date}`,
            location: 'CH',
            date: Date.parse(source.date),
            total_vaccinations_per_hundred: parseFloat(source[VACCINATIONS_PER_HUNDRED])
        }
    }
    
    getSeries(key) {
        return this._data.filter(s => s[key]).map(sample => {return {x: sample.date, y: sample[key]}})
    }
}