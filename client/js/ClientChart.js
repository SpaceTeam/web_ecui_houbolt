class ClientChart
{

    constructor(data=null)
    {
        // Themes begin
        am4core.useTheme(am4themes_material);
        am4core.useTheme(am4themes_animated);
        // Themes end

        this.amColorSet = new am4core.ColorSet();
        this.seriesList = [];
        this.isRunning = false;
        this.liveIntervalList = [];

        // Create chart instance
        this.chart = am4core.create("chartdiv", am4charts.XYChart);

        // Create axes (just one)
        this.xAxis = this.chart.xAxes.push(new am4charts.CategoryAxis());
        this.yAxis = this.chart.yAxes.push(new am4charts.ValueAxis());

        this.xAxis.dataFields.category = "time";

        // Add legend
        this.chart.legend = new am4charts.Legend();

        this._createScrollbars();
        if (data != null)
        {
            this.addData(data);
        }
        this._createCursor();
    }

    //if indicator then strokecolor must be defined
    //TODO: allow only when live tracking is not running
    addSeries(seriesName, yValueName, isIndicator=false, strokeColor=undefined)
    {
        // Create series
        var series = this.chart.series.push(new am4charts.LineSeries());

        series.name = seriesName;
        series.dataFields.valueY = yValueName;
        series.dataFields.categoryX = "time";
        series.tooltipText = "{name}: [bold]{valueY}[/]";
        series.strokeWidth = 4;
        series.minBulletDistance = 15;
        series.tooltip.getFillFromObject = false;
        series.tooltip.label.fill = am4core.color("#FFFFFF");

        if (isIndicator) {
            series.fillOpacity = 0.1;
            series.hiddenInLegend = true;
            series.stroke = strokeColor;
            series.tooltip.background.fill = strokeColor;
        }
        else {
            var nextColor = this.amColorSet.next();
            series.stroke = nextColor;
            series.tooltip.background.fill = nextColor;

            // Make bullets grow on hover
            var bullet = series.bullets.push(new am4charts.CircleBullet());
            bullet.circle.strokeWidth = 2;
            bullet.circle.radius = 4;
            bullet.circle.fill = am4core.color("#fff");

            var bullethover = bullet.states.create("hover");
            bullethover.properties.scale = 1.8;

            var serObj = {};
            serObj["series"] = series;
            serObj["yValueName"] = yValueName;
            this.seriesList.push(serObj);
        }

        //TODO: only add when scrollbar is chart scrollbar
        this.chart.scrollbarX.series.push(series);

        this._addTestData(this.chart, series);

        return series;
    }

    _createCursor()
    {
        // Make a panning cursor
        this.chart.cursor = new am4charts.XYCursor();
        //this.chart.cursor.behavior = "panXY";
        //this.chart.cursor.xAxis = this.xAxis;
        // this.chart.cursor.snapToSeries = series;
    }

    _createScrollbars()
    {
        // Create vertical scrollbar and place it before the value axis
        // this.chart.scrollbarY = new am4core.Scrollbar();
        // this.chart.scrollbarY.parent = this.chart.leftAxesContainer;
        // this.chart.scrollbarY.toBack();

        // Create a horizontal scrollbar with previe and place it underneath the date axis
        this.chart.scrollbarX = new am4charts.XYChartScrollbar();
        this.chart.scrollbarX.parent = this.chart.bottomAxesContainer;

        // this.chart.events.on("ready", function () {
        //     this.xAxis.zoom({start:0, end:1});
        // });
    }

    _addTestData(thisChart, series)
    {
        // add data
        var interval;
        var visits;
        function startInterval() {
            interval = setInterval(function() {
                var lastdataItem = series.dataItems.getIndex(series.dataItems.length - 1);
                var removeCount = 0;
                if (series.dataItems.length > 100)
                {
                    removeCount = 1;
                }
                thisChart.addData(
                    { time: lastdataItem.valueX + 0.1, value: Math.random().toPrecision(2)*30 },
                    removeCount
                );
            }, 100);
        }

        //startInterval();
    }

    addSingleData(series, valueX, valueY)
    {
        var thisObj = this;
        var found = this.chart.data.find(function(element) {
          if (element.time === valueX)
          {
              element[series.dataFields.valueY] = valueY;
              return true;
          }
          else
          {
              return false;
          }
        });
        if (!found)
        {
            let dataObj = {};
            dataObj[series.dataFields.categoryX] = valueX;
            dataObj[series.dataFields.valueY] = valueY;
            this.chart.addData(
                dataObj,
                0
            );
        }
    }

    addData(dataObj)
    {
        this.chart.addData(
            dataObj,
            0
        );
    }

    getChart()
    {
        return this.chart;
    }

    getYValueName(series)
    {
        for (let objInd in this.seriesList)
        {
            if (this.seriesList[objInd].series === series)
            {
                return this.seriesList[objInd].yValueName;
            }
        }
        return undefined;
    }

    get getSeriesList()
    {
        return this.seriesList;
    }

    start()
    {
        if (this.chart.data.length > 0)
        {
            let seriesLength = this.chart.series.length;
            this.isRunning = true;
            this.liveIntervalList = [];
            for (let i = 0; i < seriesLength; i++) {
                console.log(seriesLength);
                let currSeries = this.chart.series.getIndex(i);
                let yValueName = currSeries.dataFields.valueY;
                console.log(this.addSeries(currSeries.name + " live", yValueName + " live", true, currSeries.stroke));

                let firstPnt = this._findNextPoint(yValueName, time-1);
                let int = {};
                int.prev.x = firstPnt.time;
                int.prev.y = firstPnt[yValueName];
                let pnt = this._findNextPoint(yValueName, time);
                int.next.x = pnt.time;
                int.next.y = pnt[yValueName];
                this.liveIntervalList.push(int);
            }
            console.log(this.liveIntervalList);
        }
        else
        {
            console.error("no chart data available");
        }
    }

    _findNextPoint(valName, time)
    {
        var foundElement = this.chart.data.find(function(element) {
            return element.time > time && (valName in element);
        });
        return foundElement;
    }

    update(time)
    {
        if (this.isRunning)
        {
            for (let serInd in this.seriesList)
            {
                let currInt = this.liveIntervalList[serInd];

                if (currInt.next !== undefined)
                {
                    let yValueName = this.chart.series.getIndex(serInd).dataFields.valueY;
                    if (time >= currInt.next) {
                        //fetch next time with point from series
                        currInt.prev = currInt.next;

                        let pnt = this._findNextPoint(yValueName, time);
                        if (currInt.next !== undefined) {
                            currInt.next.x = pnt.time;
                            currInt.next.y = pnt[yValueName];
                            console.log(yValueName + " : " + time + " : " + currInt.next);
                            let scale = (currInt.next.y - currInt.prev.y) / (currInt.next.x - currInt.prev.x);
                            let y = scale * (time-currInt.prev.x) + currInt.prev.y;

                            //todo: make it prettier
                            this.addSingleData(this.chart.series.getIndex(seqInd + this.liveIntervalList.length), time, y);
                        }
                    }
                }

            }
        }
    }

    stop()
    {
        this.isRunning = false;
    }
}

function loadSequenceChart(jsonSeq)
{
    let startTime = jsonSeq.globals.startTime;
    let endTime = jsonSeq.globals.endTime;
    console.log(startTime);
    console.log(endTime);

    let serObj = {};
    for (let serInd = 0; serInd < seqChart.chart.series.length; serInd++)
    {
        let series = seqChart.chart.series.getIndex(serInd);
        serObj[series.name] = series;
    }
    console.log(serObj);
    for (let dataInd in jsonSeq.data)
    {
        for (let actionInd in jsonSeq.data[dataInd].actions)
        {
            let action = jsonSeq.data[dataInd].actions[actionInd];
            let time = action.timestamp;
            console.log(time);
            if (time === "START")
            {
                console.log("hello");
                time = startTime;
            }
            else if (time === "END")
            {
                time = endTime;
            }
            time *= 1000;
            for (let cmd in action)
            {
                if (cmd !== "timestamp")
                {
                    if (!(cmd in serObj))
                    {
                        let newSer = seqChart.addSeries(cmd, cmd);
                        serObj[cmd] = newSer;
                    }
                    seqChart.addSingleData(serObj[cmd], time, action[cmd]);
                }
            }
        }
    }
}


