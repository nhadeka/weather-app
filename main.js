import { weather_codes } from "./wom_codes.js";

const initApp = () => {
  //find the current location by GeoLocation in browser
  const geoLocation = document.getElementById("getLocation");
  getGeoWeather(geoLocation);

  const locationEntry = document.getElementById("searchBarForm");
  locationEntry.addEventListener("submit", submitNewLocation);
  setPlaceholderText();
};

document.addEventListener("DOMContentLoaded", initApp);

const getGeoWeather = () => {
  if (!navigator.geolocation) geoError();
  navigator.geolocation.getCurrentPosition(geoSuccess, geoError);
};

const geoError = (errObj) => {
  const errMsg = errObj.message ? errObj.message : "GeoLocation not supported";
  window.alert(errMsg);
  //displayError(errMsg);
};

const geoSuccess = (position) => {
  const myCoordsObj = {
    lat: position.coords.latitude,
    lon: position.coords.longitude,
  };
  updateDataAndDisplay(myCoordsObj);
};

const updateDataAndDisplay = async (locationObj) => {
  const weatherJson = await getDataFromCoords(locationObj);
  if (weatherJson) updateAndDisplayWeather(weatherJson);
};

const submitNewLocation = async (event) => {
  event.preventDefault(); //do not refresh the page after submit event
  const text = document.getElementById("searchBarText").value;
  const entryText = toProperText(text); // need to trim whitespaces so we can search it on api

  if (!entryText.length) return;
  const weatherData = await getWeatherDataFromApi(entryText);
  if (weatherData) {
    updateAndDisplayWeather(weatherData);
  } else {
    displayError("connection error");
  }
};

const toProperText = (text) => {
  const regex = /[ ]{2,}/g; //matches have 2 or more whitespaces
  //find matches have 2 or more whitespaces then replace them with 1 whitespace and trim it
  const entryText = text.replaceAll(regex, " ").trim();
  return entryText;
};

const displayError = (message) => {
  clearDisplay();
  updateWeatherLocationHeader(message);
};

const updateWeatherLocationHeader = (text) => {
  const h1 = document.getElementById("currentForecastTitle");
  h1.textContent = text;
};

const setPlaceholderText = () => {
  const input = document.getElementById("searchBarText");
  input.placeholder = "enter a city";
};

const getCoordsFromApi = async (entryText) => {
  //count=1 ->get the first match.  note: this part needs improvement in some cases...
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${entryText}&count=1`;
  const encodeUrl = encodeURI(url);

  try {
    const res = await fetch(encodeUrl);
    const jsonData = await res.json();

    //console.log("jsonData length: ", Object.keys(jsonData).length);
    if (Object.keys(jsonData).length === 1) {
      displayError("can't find the location - " + entryText);
      return;
    }

    const result = jsonData.results[0];
    return {
      lat: result.latitude,
      lon: result.longitude,
      name: result.name,
      country: result.country_code,
    };
  } catch (error) {
    displayError(error);
  }
};

const getWeatherDataFromApi = async (locationText) => {
  const coordsObj = await getCoordsFromApi(locationText);
  const result = await getDataFromCoords(coordsObj);
  return result;
};

const getDataFromCoords = async (locationObj) => {
  const { lat, lon, name, country } = locationObj;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,is_day,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min
  `;

  try {
    const res = await fetch(url);
    const jsonData = await res.json();
    const data = {
      current: jsonData.current,
      daily: jsonData.daily,
      name: name
        ? name
        : "lat: " + `${Math.round(lat * 100 + Number.EPSILON) / 100}`,
      country: country
        ? country
        : "lon: " + `${Math.round(lon * 100 + Number.EPSILON) / 100}`,
    };
    return data;
  } catch (error) {
    displayError(error);
  }
};

const updateAndDisplayWeather = (weatherData) => {
  fadeDisplay();
  clearDisplay();

  const weatherCondition = weather_codes[weatherData.current.weather_code];
  const weatherClass = weatherCondition.class;

  setBGImage(weatherClass);
  const location = weatherData.name + ", " + weatherData.country;
  updateWeatherLocationHeader(location);
  const ccArray = createCurrentConditionsDivs(weatherData);
  displayCurrentConditions(ccArray);
  document.getElementById("searchBarText").focus();
  fadeDisplay();
};

const fadeDisplay = () => {
  const cc = document.getElementById("currentForecast");
  cc.classList.toggle("zero-vis");
  cc.classList.toggle("fade-in");
};

const clearDisplay = () => {
  const currentConditions = document.getElementById(
    "currentForecastConditions"
  );
  deleteContents(currentConditions);
};

const deleteContents = (parentElement) => {
  let child = parentElement.lastElementChild;
  while (child) {
    //until no child element left
    parentElement.removeChild(child);
    child = parentElement.lastElementChild;
  }
};

const setBGImage = (weatherClass) => {
  document.documentElement.classList.add(weatherClass);
  document.documentElement.classList.forEach((img) => {
    if (img !== weatherClass) document.documentElement.classList.remove(img);
  });
};

const createCurrentConditionsDivs = (weatherData) => {
  const {
    temperature_2m,
    relative_humidity_2m,
    is_day,
    weather_code,
    wind_speed_10m,
  } = weatherData.current;
  const { temperature_2m_max, temperature_2m_min } = weatherData.daily;
  const weatherCondition = weather_codes[weatherData.current.weather_code];

  const icon = createMainImgDiv(
    weatherCondition.class,
    weatherCondition.description
  );
  const temp = createElem(
    "div",
    "temp",
    `${Math.round(weatherData.current.temperature_2m)}°`,
    "C"
  );
  const desc = createElem("div", "desc", weatherCondition.description);
  const maxTemp = createElem(
    "div",
    "maxTemp",
    `high ${Math.round(weatherData.daily.temperature_2m_max[0])}°c`
  );
  const minTemp = createElem(
    "div",
    "minTemp",
    `low ${Math.round(weatherData.daily.temperature_2m_min[0])}°c`
  );
  const humidity = createElem(
    "div",
    "humidity",
    `humidity ${weatherData.current.relative_humidity_2m}%`
  );
  const wind = createElem(
    "div",
    "wind",
    `wind ${Math.round(Number(weatherData.current.wind_speed_10m))} km/h`
  );
  return [icon, temp, desc, maxTemp, minTemp, humidity, wind];
};

const createMainImgDiv = (icon, altText) => {
  const iconDiv = createElem("div", "icon");
  iconDiv.id = "icon";
  const faIcon = translateIconToFontAwesome(icon);
  faIcon.title = altText;
  iconDiv.appendChild(faIcon);
  return iconDiv;
};

const createElem = (elemType, divClassName, divText, unit) => {
  const div = document.createElement(elemType);
  div.className = divClassName;
  if (divText) {
    div.textContent = divText;
  }
  if (divClassName === "temp") {
    const unitDiv = document.createElement("div");
    unitDiv.classList.add("unit");
    unitDiv.textContent = unit;
    div.appendChild(unitDiv);
  }
  return div;
};

const translateIconToFontAwesome = (icon) => {
  const i = document.createElement("i");
  switch (icon) {
    case "clear":
      i.classList.add("far", "fa-sun");
      break;
    case "clouds":
      i.classList.add("fa-solid", "fa-cloud-sun");
      break;
    case "rain":
      i.classList.add("fa-solid", "fa-cloud-rain");
      break;
    case "snow":
      i.classList.add("fa-solid", "fa-cloud-meatball");
      break;
    case "fog":
      i.classList.add("fa-solid", "fa-smog");
      break;
    case "hail":
      i.classList.add("fa-solid", "fa-icicles");
      break;
    case "thunder":
      i.classList.add("fa-solid", "fa-cloud-bolt");
      break;
    default:
      i.classList.add("far", "fa-question-circle");
      break;
  }
  return i;
};

const displayCurrentConditions = (currentConditionsArray) => {
  const ccContainer = document.getElementById("currentForecastConditions");
  currentConditionsArray.forEach((cc) => {
    ccContainer.appendChild(cc);
  });
};
