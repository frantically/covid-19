export const MIN_START_DATE = Date.parse("2020-03-01")

export function formatNumber(n) {
    return new Number(n).toLocaleString('de-CH')
}

export function formatDate(d) {
    return `${new Date(d).toLocaleDateString("de-CH")}`
}

function isLightTheme() {
    var url = new URL(location.href);
    var themeOverride = url.searchParams.get("theme");
    var light = true
    if(themeOverride) {
        if(themeOverride === "dark") {
            light = false
        }
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        light = false
    }
    return light
}

export function applyTheme() {
    var element = document.body;
    if (isLightTheme()) {
        element.classList.add("light");
        element.classList.remove("dark");
    } else {
        element.classList.remove("light");
        element.classList.add("dark");
    }
}

// https://stackoverflow.com/questions/1293147/example-javascript-code-to-parse-csv-data
export function CSVToArray( strData, strDelimiter ){
    strDelimiter = (strDelimiter || ",");

    var objPattern = new RegExp(
        (
            "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +
            "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
            "([^\"\\" + strDelimiter + "\\r\\n]*))"
        ),
        "gi"
        );

    var arrData = [[]];
    var arrMatches = null;
    while (arrMatches = objPattern.exec( strData )){
        var strMatchedDelimiter = arrMatches[ 1 ];
        if (
            strMatchedDelimiter.length &&
            strMatchedDelimiter !== strDelimiter
            ){
            arrData.push( [] );
        }

        var strMatchedValue;
        if (arrMatches[ 2 ]){
            strMatchedValue = arrMatches[ 2 ].replace(
                new RegExp( "\"\"", "g" ),
                "\""
                );
        } else {
            strMatchedValue = arrMatches[ 3 ];
        }
        arrData[ arrData.length - 1 ].push( strMatchedValue );
    }

    var titles = arrData.shift()
    return arrData.filter(r => r.length === titles.length).map(row => {
        return titles.reduce((object, curr, i) => (object[curr] = row[i], object), {})
    })
}