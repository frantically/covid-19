export const MIN_START_DATE = Date.parse("2020-03-01")

export function csvStringToJson(str, delimiter = ',') {
    const titles = str.slice(0, str.indexOf('\n')).split(delimiter).map(s => s.startsWith("\"") && s.endsWith("\"") ? s.slice(1, -1) : s)
    const rows = str.slice(str.indexOf('\n') + 1).split('\n').map(s => s.replace(/[\x00-\x1F\x7F-\x9F]/g, ""))
    return rows.map(row => {
        const values = row.split(delimiter).map(s => s.startsWith("\"") && s.endsWith("\"") ? s.slice(1, -1) : s)
        return titles.reduce((object, curr, i) => (object[curr] = values[i], object), {})
    })
}

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