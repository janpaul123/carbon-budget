"use strict"

const isSmallScreen = screen.width < 1000;
if (isSmallScreen) document.body.classList.add("isSmallScreen");

const width = 850;
const height = width / 3;
const startYear = isSmallScreen ? 1980 : 1960;
const totalEndYear = 2060;
const historyEndYear = 2021;
const maxGtCO2 = 60; // Roughly SSP3-7.0 (no policy). See https://www.nature.com/articles/d41586-020-00177-3
const yTicks = [
  { value: 0, label: "" },
  { value: 20, label: "20" },
  { value: 40, label: "40" },
  { value: 60, label: "60" },
];
const xTicks = [
  { value: 1960, label: "1960" },
  { value: 1970, label: "" },
  { value: 1980, label: "1980" },
  { value: 1990, label: "" },
  { value: 2000, label: "2000" },
  { value: 2010, label: "" },
  { value: 2020, label: "2020" },
  { value: 2030, label: "" },
  { value: 2040, label: "2040" },
  { value: 2050, label: "" },
  { value: 2060, label: "2060" },
];

let lastHistoryGtCO2;

const historyYears = historyEndYear - startYear;
const projectionYears = totalEndYear - historyEndYear;
const totalYears = totalEndYear - startYear;
const widthPerYear = width / (totalEndYear - startYear);
const historyWidth = historyYears*widthPerYear;
const projectionWidth = projectionYears*widthPerYear;

function getXByYear(year) {
  return width * (year - startYear) / totalYears
}

function getYByGtCO2(value) {
  return (height - (value/maxGtCO2*height));
}

function clamp(val, min, max) {
  return Math.max(Math.min(val, max), min);
}

// https://stackoverflow.com/a/43747218
function getPolygonCentroid(pts) {
   var first = pts[0], last = pts[pts.length-1];
   if (first.x != last.x || first.y != last.y) pts.push(first);
   var twicearea=0,
   x=0, y=0,
   nPts = pts.length,
   p1, p2, f;
   for ( var i=0, j=nPts-1 ; i<nPts ; j=i++ ) {
      p1 = pts[i]; p2 = pts[j];
      f = (p1.y - first.y) * (p2.x - first.x) - (p2.y - first.y) * (p1.x - first.x);
      twicearea += f;
      x += (p1.x + p2.x - 2 * first.x) * f;
      y += (p1.y + p2.y - 2 * first.y) * f;
   }
   f = twicearea * 3;
   return { x:x/f + first.x, y:y/f + first.y };
}

function dragEvents(el, downFn) {
  el.addEventListener("mousedown", (downEvent) => {
    downEvent.preventDefault();
    const {moveFn, upFn} = downFn(downEvent);
    document.addEventListener("mousemove", moveFn, true);
    document.addEventListener("mouseup", () => {
      document.removeEventListener("mousemove", moveFn, true);
      upFn();
    }, true);
  });
  el.addEventListener("touchstart", (downEvent) => {
    downEvent.preventDefault();
    const {moveFn, upFn} = downFn(downEvent);
    document.addEventListener("touchmove", moveFn, true);
    document.addEventListener("touchend", () => {
      document.removeEventListener("touchmove", moveFn, true);
      upFn();
    }, true);
    document.addEventListener("touchcancel", () => {
      document.removeEventListener("touchmove", moveFn, true);
      upFn();
    }, true);
  });
}

{
  const chartSvg = document.querySelector("#chartSvg");
  chartSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  chartSvg.setAttribute("width", width);
  chartSvg.setAttribute("height", height);

  const chartContainer = document.querySelector("#chartContainer");
  chartContainer.style.width = width + "px";
  chartContainer.style.height = height + "px";
  for (const yTick of yTicks) {
    const tickElement = document.createElement("div");
    chartContainer.prepend(tickElement);
    tickElement.setAttribute("class", "yTick");
    tickElement.style.top = getYByGtCO2(yTick.value) + "px";
    const labelElement = document.createElement("div");
    tickElement.prepend(labelElement);
    labelElement.setAttribute("class", "yTickLabel");
    labelElement.innerText = yTick.label;
  }
  for (const xTick of xTicks) {
    if (xTick.value < startYear || xTick.value > totalEndYear) continue;
    const tickElement = document.createElement("div");
    chartContainer.prepend(tickElement);
    tickElement.setAttribute("class", "xTick");
    tickElement.style.left = (xTick.value === totalEndYear ? width-1 : getXByYear(xTick.value)) + "px";
    const labelElement = document.createElement("div");
    tickElement.prepend(labelElement);
    labelElement.setAttribute("class", "xTickLabel");
    labelElement.innerText = xTick.label;
  }
}

{
  const path = document.querySelector("#historicalPath");

  let gtCO2ByYear = [];
  {
    // 1960-2018: https://www.globalcarbonproject.org/carbonbudget/19/data.htm
    // 2019-2021: per https://www.nature.com/articles/s41558-020-0797-x "no growth" for 2019;
    // and -4 to -7% growth in 2020 due to covid -- I used -5%; see https://www.globalcarbonproject.org/news/TemporaryReductionInCO2EmissionsDuringCOVID-19.html;
    // and ~4.5% rebound in 2021 as they cite IMF and EIA (+5.8% and +3.5% respectively).
    const GtCarbonByActualYear = { "1960": 2.55, "1961": 2.56, "1962": 2.65, "1963": 2.80, "1964": 2.94, "1965": 3.08, "1966": 3.22, "1967": 3.33, "1968": 3.51, "1969": 3.74, "1970": 4.05, "1971": 4.21, "1972": 4.41, "1973": 4.64, "1974": 4.62, "1975": 4.62, "1976": 4.86, "1977": 5.00, "1978": 5.18, "1979": 5.32, "1980": 5.29, "1981": 5.15, "1982": 5.11, "1983": 5.16, "1984": 5.31, "1985": 5.50, "1986": 5.58, "1987": 5.76, "1988": 5.98, "1989": 6.07, "1990": 6.20, "1991": 6.33, "1992": 6.13, "1993": 6.20, "1994": 6.24, "1995": 6.38, "1996": 6.58, "1997": 6.61, "1998": 6.59, "1999": 6.67, "2000": 6.87, "2001": 6.92, "2002": 7.07, "2003": 7.41, "2004": 7.76, "2005": 8.02, "2006": 8.29, "2007": 8.54, "2008": 8.73, "2009": 8.61, "2010": 9.05, "2011": 9.35, "2012": 9.50, "2013": 9.54, "2014": 9.61, "2015": 9.62, "2016": 9.66, "2017": 9.77, "2018": 9.98, "2019": 9.98, "2020": 9.48, "2021": 9.9 };
    for (let year = 0; year<=historyYears; year++) {
      gtCO2ByYear[year] = lastHistoryGtCO2 = GtCarbonByActualYear[startYear + year] * 3.664; // 3.664 for C -> CO2
    }
  }

  const coordinates = gtCO2ByYear.map((value, year) => (year*widthPerYear) + " " + getYByGtCO2(value));
  path.setAttribute("d", "M " + coordinates.join(" L ") + ` L ${historyWidth} ${height} L 0 ${height} Z`);
}

function getAreaData(x1, x2, y1, y2) {
  let labelPoint;
  if ((2*height-y1-y2)*(x2-x1) > 10000){
    labelPoint = getPolygonCentroid([{x:x1,y:y1}, {x:x2,y:y2}, {x:x2,y:height}, {x:x1,y:height}]);
    labelPoint.y = Math.max(0.68*height, labelPoint.y);
  }

  return {
    path: `M ${x1} ${y1} L ${x2} ${y2} L ${x2} ${height} L ${x1} ${height} Z`,
    labelPoint,
  };
}

projectedPath.setAttribute("d", getAreaData(historyWidth, width, getYByGtCO2(lastHistoryGtCO2), getYByGtCO2(maxGtCO2)).path);

function computeWhenBudgetDepletes(budget, year, gtCO2range) {
  const yearRange = year - historyEndYear;
  const a = -(lastHistoryGtCO2-gtCO2range)/(2*yearRange);
  const b = lastHistoryGtCO2;
  const c = -budget;
  const depletedYearOffset = Math.min((-b+Math.sqrt(b*b-4*a*c))/(2*a), yearRange);
  if (isNaN(depletedYearOffset)) return undefined;

  const gtCO2 = lastHistoryGtCO2 - depletedYearOffset/yearRange*(lastHistoryGtCO2-gtCO2range);
  return { year: depletedYearOffset+historyEndYear, gtCO2 };
}

{
  const chartContainer = document.querySelector("#chartContainer");
  const knobContainer = document.querySelector("#knobContainer");
  const knobNeutral = document.querySelector("#knobNeutral");
  const knobDown = document.querySelector("#knobDown");

  let knobPosition = { year: totalEndYear, gtCO2: maxGtCO2 };

  function updateKnobContainerPosition() {
    if (knobPosition.gtCO2 < 20) document.body.classList.add("interactionAllowed");

    knobContainer.style.left = getXByYear(knobPosition.year) + "px";
    knobContainer.style.top = getYByGtCO2(knobPosition.gtCO2) + "px";

    const budgets = [
      // Source: page 10, #1 of "Estimating and tracking the remaining carbon budget for stringent climate targets", Rogelj et al., Nature, 2019
      // https://static-content.springer.com/esm/art%3A10.1038%2Fs41586-019-1368-z/MediaObjects/41586_2019_1368_MOESM1_ESM.pdf
      // #1 is "IPCC SR1.5 (2018) SAT"
      // Manually subtracted amounts for 2018-2021
      { amount: 420-9.98-9.98-9.48-9.9, element: document.querySelector("#budget15"), labelElement: document.querySelector("#budgetLabel15") },
      { amount: 1170-9.98-9.98-9.48-9.9, element: document.querySelector("#budget20"), labelElement: document.querySelector("#budgetLabel20") },
      { amount: 100000, element: document.querySelector("#budgetDead"), labelElement: document.querySelector("#budgetLabelDead") },
    ];

    let lastGtCO2 = lastHistoryGtCO2;
    let lastYear = historyEndYear;
    for (const budget of budgets) {
      budget.element.style.visibility = "hidden";
      budget.labelElement.style.visibility = "hidden";
    }
    for (const budget of budgets) {
      budget.element.style.visibility = "visible";

      const depleted = computeWhenBudgetDepletes(budget.amount, knobPosition.year, knobPosition.gtCO2);
      if (!depleted) {
        const areaData = getAreaData(getXByYear(lastYear)-0.5, getXByYear(knobPosition.year), getYByGtCO2(lastGtCO2), getYByGtCO2(knobPosition.gtCO2));
        budget.element.setAttribute("d", areaData.path);
        if (areaData.labelPoint) {
          budget.labelElement.style.visibility = "visible";
          budget.labelElement.style.left = areaData.labelPoint.x + "px";
          budget.labelElement.style.top = areaData.labelPoint.y + "px";
        }
        break;
      }

      const year = depleted.year;
      const areaData = getAreaData(getXByYear(lastYear)-0.5, getXByYear(year), getYByGtCO2(lastGtCO2), getYByGtCO2(depleted.gtCO2));
      budget.element.setAttribute("d", areaData.path);
      if (areaData.labelPoint) {
        budget.labelElement.style.visibility = "visible";
        budget.labelElement.style.left = areaData.labelPoint.x + "px";
        budget.labelElement.style.top = areaData.labelPoint.y + "px";
      }

      lastGtCO2 = depleted.gtCO2;
      lastYear = year;
    }
  }

  knobNeutral.style.display = "block";
  updateKnobContainerPosition();

  dragEvents(knobNeutral, (downEvent) => {
    const knobContainerRect = knobContainer.getBoundingClientRect();
    const xOffset = downEvent.pageX - knobContainerRect.left;
    const yOffset = downEvent.pageY - knobContainerRect.top;
    knobNeutral.style.display = "none";
    knobDown.style.display = "block";
    document.body.style.cursor = "grabbing";

    return {
      moveFn: (moveEvent) => {
        const chartContainerRect = chartContainer.getBoundingClientRect();
        const x = clamp(moveEvent.pageX - chartContainerRect.left - xOffset, 0, width);
        const y = clamp(moveEvent.pageY - chartContainerRect.top - yOffset, 0, height);
        const year = clamp((x / width * totalYears) + startYear, historyEndYear + 1, totalEndYear);
        const gtCO2 = maxGtCO2 - (y / height * maxGtCO2);

        if (year === totalEndYear) knobPosition.year = year;
        if (gtCO2 === 0) knobPosition.gtCO2 = gtCO2;

        if (knobPosition.gtCO2 > 0 || year === totalEndYear) {
          knobPosition.gtCO2 = gtCO2;
        } else {
          knobPosition.year = year;
        }
        updateKnobContainerPosition();
      },
      upFn: () => {
        knobNeutral.style.display = "block";
        knobDown.style.display = "none";
        document.body.style.cursor = "initial";
      },
    }
  });
}

{
  function createPopup(targetSelector, popupSelector, activeClassName) {
    document.querySelector(targetSelector).addEventListener("click", (outerEvent) => {
      outerEvent.stopPropagation();

      const bodyClasslist = Array.from(document.body.classList);

      if (!bodyClasslist.includes("interactionAllowed")) return;

      document.body.classList.remove("popupActiveBudget15");
      document.body.classList.remove("popupActiveBudget20");
      document.body.classList.remove("popupActiveBudgetDead");

      if (!bodyClasslist.includes(activeClassName)) {
        document.body.classList.add(activeClassName);
      }

      document.querySelector(popupSelector + " .popupLine").style.left = outerEvent.pageX + "px";

      function onClick(innerEvent) {
        if (document.querySelector(popupSelector).contains(innerEvent.target)) return;

        document.body.removeEventListener("click", onClick);
        document.body.classList.remove(activeClassName);
      }
      document.body.addEventListener("click", onClick);
    });
  }
  createPopup("#budget15", "#popupContainer15", "popupActiveBudget15")
  createPopup("#budget20", "#popupContainer20", "popupActiveBudget20")
  createPopup("#budgetDead", "#popupContainerDead", "popupActiveBudgetDead")
}
