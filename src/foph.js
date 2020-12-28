export class FOPHCoronaStatistics {

    _data = {}
    _locationConfig = {}

    constructor(sourceData, locationConfig) {
        if(sourceData[0].median_R_mean) {
            this._data = sourceData.map(this._reConverter).filter(sample => sample.re)
        } else {
            this._data = this._removeLastEntriesIfNotComplete(sourceData.map(this._standardConverter))
        }
        this._locationConfig = locationConfig
    }

    _getDataSeries(location, yFunction) {
        return this._data
            .filter(d => d.location === location)
            .map(sample => {return {x: sample.date, y: yFunction(sample)}})
    }
    
    getTotalDataSeries(location) {
        return this._getDataSeries(location, (sample) => sample.sumTotal)
    }

    getCasesPer100kDataSeries(location) {
        return this._getDataSeries(location, (sample) => sample.sum7d/7/(this._locationConfig[location].population/100000))
    }

    get7DayAverageDataSeries(location) {
        return this._getDataSeries(location, (sample) => sample.sum7d/7)
    }

    getReDataSeries(location) {
        return this._getDataSeries(location, (sample) => sample.re)
    }

    getMaxDate(location) {
        var ds = this.getTotalDataSeries(location)
        return ds[ds.length-1]. x
    }

    getLastWeekTotal(location) {
        var ds = this._getDataSeries(location, (sample) => sample.sum7d)
        return ds[ds.length-1].y
    }

    _getPriorWeekTotal(location) {
        var ds = this._getDataSeries(location, (sample) => sample.sum7d)
        return ds[ds.length-8].y
    }

    getLastWeekOnWeekPercentage(location) {
        var lastWeek = this.getLastWeekTotal(location)
        var priorWeek = this._getPriorWeekTotal(location)
        return ((lastWeek-priorWeek)/priorWeek)*100
    }

    _removeLastEntriesIfNotComplete(data) {
        var maxDate = data.reduce((a, c) => Math.max(a, c.date), 0)
        return data.filter(sample => !(sample.date === maxDate && sample.timeframe_7d === false))
    }

    _reConverter(source) {
        return {
            key: `${source.geoRegion}_${source.date}`,
            location: source.geoRegion,
            date: Date.parse(source.date),
            re: parseFloat(source.median_R_mean)
        }
    }
    
    _standardConverter(source) {
        return {
            key: `${source.geoRegion}_${source.date}`,
            location: source.geoRegion,
            date: Date.parse(source.datum),
            entries: parseInt(source.entries),
            sumTotal: parseInt(source.sumTotal),
            sum7d: parseInt(source.sum7d),
            timeframe_7d: source.timeframe_7d=== 'TRUE'
        }
    }
}
