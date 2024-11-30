import points from "../data/points.js";

require([
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/GraphicsLayer",
  "esri/Graphic",
  "esri/widgets/TimeSlider",
], function (Map, MapView, GraphicsLayer, Graphic, TimeSlider) {
  const time = {
    startDate: "",
    endDate: "",
  };
  const pointData = JSON.parse(localStorage.getItem("points")) || points;

  const districtStats = {};
  pointData.forEach((point) => {
    if (!districtStats[point.district]) {
      districtStats[point.district] = {
        totalCases: 0,
        active: 0,
        recovered: 0,
        deaths: 0,
      };
    }
    let cases = 0;
    let active = 0;
    let recovered = 0;
    let deaths = 0;
    point.cases.forEach((data) => {
      cases += data.cases;
      active += data.active;
      recovered += data.recovered;
      deaths += data.deaths;
    });

    districtStats[point.district].totalCases += cases;
    districtStats[point.district].active += active;
    districtStats[point.district].recovered += recovered;
    districtStats[point.district].deaths += deaths;
  });

  // Tạo map
  const map = new Map({
    basemap: "topo-vector",
  });

  // Tạo view
  const view = new MapView({
    container: "viewDiv",
    map: map,
    center: [106.6889811, 10.7753493],
    zoom: 14,
  });

  // Tạo layers
  const pointLayer = new GraphicsLayer();
  const polygonLayer = new GraphicsLayer();
  map.addMany([polygonLayer, pointLayer]);

  // Hàm lấy màu dựa trên số ca nhiễm
  function getColor(cases) {
    if (cases <= 50) return [255, 255, 0, 0.6]; // Vàng
    if (cases <= 100) return [255, 165, 0, 0.6]; // Cam
    if (cases <= 200) return [255, 69, 0, 0.6]; // Đỏ cam
    return [255, 0, 0, 0.6]; // Đỏ
  }

  // Hàm lấy kích thước điểm dựa trên số ca
  function getSize(cases) {
    return Math.min(Math.max(cases, 8), 30);
  }

  // Cập nhật select box quận
  function updateWardFilter() {
    const districts = [...new Set(pointData.map((point) => point.ward))].sort();
    const select = document.getElementById("wardFilter");
    districts.forEach((district) => {
      const option = document.createElement("option");
      option.value = district;
      option.textContent = district;
      select.appendChild(option);
    });
  }

  // Tạo điểm
  function createPoints(district = "all") {
    pointLayer.removeAll();
    const data = filterDataWithTime(pointData, time.startDate, time.endDate);
    const filteredData =
      district === "all"
        ? data
        : data.filter((point) => point.ward === district);

    filteredData.forEach((point) => {
      const cases = point.cases.reduce((sum, data) => sum + data.cases, 0);
      const active = point.cases.reduce((sum, data) => sum + data.active, 0);
      const recovered = point.cases.reduce(
        (sum, data) => sum + data.recovered,
        0
      );
      const deaths = point.cases.reduce((sum, data) => sum + data.deaths, 0);

      point.cases = cases;
      point.active = active;
      point.recovered = recovered;
      point.deaths = deaths;

      const graphic = new Graphic({
        geometry: {
          type: "point",
          longitude: point.location.longitude,
          latitude: point.location.latitude,
        },
        symbol: {
          type: "simple-marker",
          color: getColor(cases),
          outline: {
            color: [255, 255, 255],
            width: 1,
          },
          size: getSize(cases),
        },
        attributes: point,
        popupTemplate: {
          title: "{ward}, {district}",
          content: [
            {
              type: "fields",
              fieldInfos: [
                { fieldName: "cases", label: "Tổng số ca" },
                { fieldName: "active", label: "Đang điều trị" },
                { fieldName: "recovered", label: "Đã hồi phục" },
                { fieldName: "deaths", label: "Tử vong" },
                { fieldName: "date", label: "Ngày ghi nhận" },
              ],
            },
          ],
        },
      });
      pointLayer.add(graphic);
    });
    updateStats(district);
  }

  // Tạo polygon
  function createPolygons(district = "all") {
    polygonLayer.removeAll();
    const data = filterDataWithTime(pointData, time.startDate, time.endDate);

    const filteredPolygons =
      district === "all" ? data : data.filter((ward) => ward.ward === district);

    filteredPolygons.forEach((ward) => {
      const cases = ward.cases.reduce((sum, data) => sum + data.cases, 0);
      const active = ward.cases.reduce((sum, data) => sum + data.active, 0);
      const recovered = ward.cases.reduce(
        (sum, data) => sum + data.recovered,
        0
      );
      const deaths = ward.cases.reduce((sum, data) => sum + data.deaths, 0);

      ward.cases = cases;
      ward.active = active;
      ward.recovered = recovered;
      ward.deaths = deaths;

      const graphic = new Graphic({
        geometry: {
          type: "polygon",
          rings: ward.geometry.rings,
        },
        symbol: {
          type: "simple-fill",
          color: getColor(cases),
          outline: {
            color: "white",
            width: 1,
          },
        },
        attributes: ward,
        popupTemplate: {
          title: "{ward}, {district}",
          content: [
            {
              type: "fields",
              fieldInfos: [
                { fieldName: "cases", label: "Tổng số ca" },
                { fieldName: "active", label: "Đang điều trị" },
                { fieldName: "recovered", label: "Đã hồi phục" },
                { fieldName: "deaths", label: "Tử vong" },
              ],
            },
          ],
        },
      });
      polygonLayer.add(graphic);
    });
    updateStats(district);
  }

  // Cập nhật thống kê
  function updateStats(district = "all") {
    const stats = document.getElementById("stats");
    const table = document.querySelector(".stats-table tbody");
    table.innerHTML = ""; // Clear existing rows

    if (district === "all") {
      Object.entries(districtStats).forEach(([dist, data]) => {
        const row = table.insertRow();
        // row.innerHTML = `
        //               <td>${dist}</td>
        //               <td>${data.totalCases}</td>
        //               <td>${data.active}</td>
        //           `;
      });

      const totalCases = Object.values(districtStats).reduce(
        (sum, dist) => sum + dist.totalCases,
        0
      );
      const totalActive = Object.values(districtStats).reduce(
        (sum, dist) => sum + dist.active,
        0
      );
      const totalRecovered = Object.values(districtStats).reduce(
        (sum, dist) => sum + dist.recovered,
        0
      );
      const totalDeaths = Object.values(districtStats).reduce(
        (sum, dist) => sum + dist.deaths,
        0
      );

      stats.innerHTML = `
                  <p>Tổng số ca nhiễm: ${totalCases}</p>
                  <p>Đang điều trị: ${totalActive}</p>
                  <p>Đã hồi phục: ${totalRecovered}</p>
                  <p>Tử vong: ${totalDeaths}</p>
              `;
    } else {
      const distData = districtStats[district];
      if (distData) {
        stats.innerHTML = `
                      <p>${district}</p>
                      <p>Tổng số ca nhiễm: ${distData.totalCases}</p>
                      <p>Đang điều trị: ${distData.active}</p>
                      <p>Đã hồi phục: ${distData.recovered}</p>
                      <p>Tử vong: ${distData.deaths}</p>
                  `;
      }
    }
  }

  // Tạo chú thích
  function createLegend() {
    const legendContent = document.querySelector(".legend-content");
    legendContent.innerHTML = `
              <div class="legend-item">
                  <div class="color-box" style="background: rgba(255,255,0,0.6)"></div>
                  <span>1-50 ca</span>
              </div>
              <div class="legend-item">
                  <div class="color-box" style="background: rgba(255,165,0,0.6)"></div>
                  <span>51-100 ca</span>
              </div>
              <div class="legend-item">
                  <div class="color-box" style="background: rgba(255,69,0,0.6)"></div>
                  <span>101-200 ca</span>
              </div>
              <div class="legend-item">
                  <div class="color-box" style="background: rgba(255,0,0,0.6)"></div>
                  <span>>200 ca</span>
              </div>
          `;
  }

  // Xử lý sự kiện
  document.getElementById("pointsBtn").addEventListener("click", (e) => {
    document
      .querySelectorAll(".btn")
      .forEach((btn) => btn.classList.remove("active"));
    e.target.classList.add("active");
    polygonLayer.visible = false;
    pointLayer.visible = true;
    createPoints(document.getElementById("wardFilter").value);
  });

  document.getElementById("polygonBtn").addEventListener("click", (e) => {
    document
      .querySelectorAll(".btn")
      .forEach((btn) => btn.classList.remove("active"));
    e.target.classList.add("active");
    pointLayer.visible = false;
    polygonLayer.visible = true;
    createPolygons(document.getElementById("wardFilter").value);
  });

  document.getElementById("wardFilter").addEventListener("change", (e) => {
    console.log({ time });
    const ward = e.target.value;
    if (pointLayer.visible) {
      createPoints(ward);
    } else {
      createPolygons(ward);
    }

    if (ward !== "all") {
      const wardPoints = pointData.filter((point) => point.ward === ward);
      if (wardPoints.length > 0) {
        const center = wardPoints[0].location;
        view.goTo({
          center: [center.longitude, center.latitude],
          zoom: 13,
        });
      }
    } else {
      view.goTo({
        center: [106.6297, 10.8231],
        zoom: 11,
      });
    }
  });

  document.getElementById("addDataBtn").addEventListener("click", () => {
    window.location.href = "addData.html";
  });

  const filterDataWithTime = (data, startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return data.map((point) => {
      const cases = point.cases.filter((data) => {
        const date = new Date(data.date + "T00:00:00.000");
        return date >= start && date <= end;
      });
      return {
        ...point,
        cases: cases,
      };
    });
  };

  // Khởi tạo time slider
  const timeSlider = new TimeSlider({
    container: "timeSlider",
    view: view,
    timeVisible: true,
    fullTimeExtent: {
      start: new Date(2020, 2, 15),
      end: new Date(2020, 3, 15),
    },
    stops: {
      interval: {
        value: 1,
        unit: "days",
      },
    },
  });

  timeSlider.watch("timeExtent", function (timeExtent) {
    time.startDate = timeExtent.start;
    time.endDate = timeExtent.end;

    if (pointLayer.visible) {
      createPoints(document.getElementById("wardFilter").value);
    } else {
      createPolygons(document.getElementById("wardFilter").value);
    }
  });

  polygonLayer.visible = true;
  pointLayer.visible = false;
  updateWardFilter();
  createLegend();
});
