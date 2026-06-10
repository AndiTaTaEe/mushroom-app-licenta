import {useMemo} from "react";

// hook to convert temperature from Celsius to Fahrenheit based on user preference, and handle edge cases for invalid or missing data
export const useTemperatureConversion = (
    celsius: number | string,
    isFahrenheit: boolean
) => {
    // using useMemo to avoid unnecessary recalculations unless celsius or isFahrenheit changes
    return useMemo(() => {
        if (celsius === "--" || celsius === undefined || celsius === null) {
            return {displayTemp: "--", unit: isFahrenheit ? "°F" : "°C"};
        }
        // if celsius is a string (which can happen if the data is missing or invalid), try to parse it as a float
        const tempC = typeof celsius === "string" ? parseFloat(celsius) : celsius;
        // if parsing results in NaN, return "--" to indicate invalid data
        if (isNaN(tempC)){
            return {displayTemp: "--", unit: isFahrenheit ? "°F" : "°C"};
        }
        const displayTemp = isFahrenheit ? ((tempC * 9) / 5 + 32).toFixed(1) : tempC.toFixed(1);
        const unit = isFahrenheit ? "°F" : "°C";
        return {displayTemp, unit};
    }, [celsius, isFahrenheit]);
};