import points from "../data/points.js";

const pointData = JSON.parse(sessionStorage.getItem("points")) || points;

document.addEventListener("DOMContentLoaded", () => {
  const selection = document.getElementById("wardSelect");
  pointData.forEach((point, index) => {
    const option = document.createElement("option");
    option.value = point.ward;
    option.textContent = point.ward;
    selection.appendChild(option);
  });
});

document.getElementById("submit").addEventListener("click", (event) => {
  const ward = document.getElementById("wardSelect").value;
  const cases = document.getElementById("cases").value;
  const deaths = document.getElementById("death").value;
  const recovered = document.getElementById("recovered").value;
  const active = document.getElementById("active").value;
  const date = document.getElementById("date").value;

  const data = {
    cases: parseInt(cases),
    deaths: parseInt(deaths),
    recovered: parseInt(recovered),
    active: parseInt(active),
    date: date,
  };
  console.log({ data });

  const newDataIndex = pointData.findIndex((point) => point.ward === ward);
  const newCasesIndex = pointData[newDataIndex].cases.findIndex(
    (item) => item.date === date
  );
  if (newCasesIndex !== -1) {
    alert("Data already exists for this date");
    return;
  } else {
    pointData[newDataIndex].cases.push(data);
    pointData[newDataIndex].cases.sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
    sessionStorage.setItem("points", JSON.stringify(pointData));
    window.location.href = "main.html";
  }
});
