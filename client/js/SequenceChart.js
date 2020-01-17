class SequenceChart
{

    constructor(id, name=null, data=null)
    {
        // Themes begin
        am4core.useTheme(am4themes_material);
        //am4core.useTheme(am4themes_animated);
        // Themes end

        this.amColorSet = new am4core.ColorSet();
        this.seriesList = [];
        this.isRunning = false;
        this.liveIntervalList = [];

        // Create chart instance
        this.chart = am4core.create(id, am4charts.XYChart);

        if (name != null) {
            var title = this.chart.titles.create();
            title.text = name;
            title.fontSize = 25;
            title.marginBottom = 30;
        }

        // Create axes (just one)
        this.xAxis = this.chart.xAxes.push(new am4charts.DurationAxis());
        this.yAxis = this.chart.yAxes.push(new am4charts.ValueAxis());

        this.xAxis.dataFields.category = "time";
        this.xAxis.baseUnit = "millisecond";

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
    addSeries(seriesName, yValueName, interpolation="none", isIndicator=false, strokeColor=undefined)
    {
        // Create series
        var series;
        if (interpolation === "none")
        {
            series = this.chart.series.push(new am4charts.StepLineSeries());
        }
        else if (interpolation === "linear")
        {
            series = this.chart.series.push(new am4charts.LineSeries());
        }
        else
        {
            series = this.chart.series.push(new am4charts.StepLineSeries());
        }


        series.name = seriesName;
        series.dataFields.valueY = yValueName;
        series.dataFields.valueX = "time";
        series.tooltipText = "{name}: [bold]{valueY}[/]";
        series.strokeWidth = 4;
        series.minBulletDistance = 15;
        series.tooltip.getFillFromObject = false;
        series.tooltip.label.fill = am4core.color("#FFFFFF");

        if (isIndicator) {
            series.fillOpacity = 0.1;
            series.hiddenInLegend = true;
            series.stroke = strokeColor;
            series.fill = strokeColor;
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
        //this.chart.scrollbarX.series.push(series);

        return series;
    }

    _createCursor()
    {
        // Make a panning cursor
        this.chart.cursor = new am4charts.XYCursor();
        this.chart.cursor.behavior = "panXY";
        this.chart.cursor.xAxis = this.xAxis;
        //this.chart.cursor.snapToSeries = series;
    }

    _createScrollbars()
    {
        // Create vertical scrollbar and place it before the value axis
        // this.chart.scrollbarY = new am4core.Scrollbar();
        // this.chart.scrollbarY.parent = this.chart.leftAxesContainer;
        // this.chart.scrollbarY.toBack();

        // Create a horizontal scrollbar with previe and place it underneath the date axis
        //this.chart.scrollbarX = new am4charts.XYChartScrollbar();
        //this.chart.scrollbarX.parent = this.chart.bottomAxesContainer;

        // this.chart.events.on("ready", function () {
        //     this.xAxis.zoom({start:0, end:1});
        // });
    }

    addSingleData(series, valueX, valueY)
    {
        var thisObj = this;
        var foundIndex = this.chart.data.findIndex(function(element) {
              return (element.time === valueX);
        });

        let dataObj = {};
        if (foundIndex >= 0)
        {
            dataObj = this.chart.data[foundIndex];
            this.chart.data.splice(foundIndex,1);

        }
        else
        {
            dataObj[series.dataFields.valueX] = valueX;
        }
        dataObj[series.dataFields.valueY] = valueY;

        this.chart.addData(
                    dataObj,
                    0
                );
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
        if (!this.isRunning)
        {
            if (this.chart.data.length > 0)
            {
                let seriesLength = this.chart.series.length;
                this.isRunning = true;
                this.liveIntervalList = [];
                for (let i = 0; i < seriesLength; i++) {

                    let currSeries = this.chart.series.getIndex(i);
                    let yValueName = currSeries.dataFields.valueY;
                    console.log("name: " + currSeries.name + " interp: " + this.getInterpolationFromName(currSeries.name));
                    console.log(this.addSeries(currSeries.name + " live", yValueName + " live", this.getInterpolationFromName(currSeries.name), true, currSeries.stroke));

                    let time = this.chart.data[0].time;

                    let firstPnt = this._findNextPoint(yValueName, time);
                    console.log(seriesLength);
                    console.log(yValueName);
                    console.log(time);
                    console.log(firstPnt);
                    let int = {};
                    int.prev = {};
                    int.prev.x = firstPnt.time;
                    int.prev.y = firstPnt[yValueName];
                    let pnt = this._findNextPoint(yValueName, time+1);
                    int.next = {};
                    int.next.x = pnt.time;
                    int.next.y = pnt[yValueName];
                    this.liveIntervalList.push(int);
                }
                // console.log(this.liveIntervalList);
            }
            else
            {
                console.error("no chart data available");
            }
        }
        else
        {
            console.error("live tracker already running");
        }
    }

    _findNextPoint(valName, time)
    {
        var foundElement = this.chart.data.find(function(element) {
            return element.time >= time && (valName in element);
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

                    //todo: make it prettier
                    let currLiveSeries = this.chart.series.getIndex(parseInt(serInd) + this.liveIntervalList.length);
                    if (time === currInt.next.x)
                    {
                        this.addSingleData(currLiveSeries, time, currInt.next.y);
                        //console.log({"time": time, "y": currInt.next.y});
                    }
                    else
                    {
                        //todo: make better solution
                        if (currLiveSeries.constructor.name === "e") //constructor name of Line Series
                        {
                            let scale = (currInt.next.y - currInt.prev.y) / (currInt.next.x - currInt.prev.x);
                            let y = scale * (time-currInt.prev.x) + currInt.prev.y;

                            //console.log("time: " + time + " scale: " + scale + " y: " + y);
                            this.addSingleData(currLiveSeries, time, y);
                        }
                    }

                    let yValueName = this.chart.series.getIndex(serInd).dataFields.valueY;
                    if (time >= currInt.next.x) {
                        //fetch next time with point from series
                        currInt.prev = currInt.next;
                        let newNextInt = {};

                        let pnt = this._findNextPoint(yValueName, time);
                        if (pnt === undefined) {
                            newNextInt = undefined;

                        }
                        else
                        {
                            newNextInt.x = pnt.time;
                            newNextInt.y = pnt[yValueName];
                        }
                        currInt.next = newNextInt;
                    }
                }

            }
        }
    }

    stop()
    {
        this.isRunning = false;

    }

    reset()
    {

        for (let i=this.chart.series.length-1; i >= this.seriesList.length; i--) {
            this.chart.series.removeIndex(i).dispose();
        }
        this.chart.data = [];
    }

    loadSequenceChart(jsonSeq)
    {
        this.globals = jsonSeq.globals;
        let startTime = jsonSeq.globals.startTime;
        let endTime = jsonSeq.globals.endTime;

        let serObj = {};
        for (let serInd = 0; serInd < this.chart.series.length; serInd++)
        {
            let series = this.chart.series.getIndex(serInd);
            serObj[series.name] = series;
        }

        for (let dataInd in jsonSeq.data)
        {
            for (let actionInd in jsonSeq.data[dataInd].actions)
            {
                let action = jsonSeq.data[dataInd].actions[actionInd];
                let time = action.timestamp;

                if (time === "START")
                {
                    time = startTime;
                }
                else if (time === "END")
                {
                    time = endTime;
                }
                time *= 1000;
                for (let cmd in action)
                {
                    if (cmd === "sensorsNominalRange")
                    {
                        // for (let sensorName in action[cmd])
                        // {
                        //     let sensorNameMin = sensorName + "Min";
                        //     let sensorNameMax = sensorName + "Max";
                        //     if (!(sensorNameMin in serObj) && !(sensorNameMax in serObj))
                        //     {
                        //         let newSerMin = this.addSeries(sensorNameMin, sensorNameMin);
                        //         serObj[sensorNameMin] = newSerMin;
                        //         newSerMin.hide();
                        //
                        //         let newSerMax = this.addSeries(sensorNameMax, sensorNameMax);
                        //         serObj[sensorNameMax] = newSerMax;
                        //         newSerMax.hide();
                        //     }
                        //     this.addSingleData(serObj[sensorNameMin], time, action[cmd][sensorName][0]);
                        //     this.addSingleData(serObj[sensorNameMax], time, action[cmd][sensorName][1]);
                        // }
                    }
                    else if (cmd !== "timestamp")
                    {
                        if (!(cmd in serObj))
                        {
                            let newSer = this.addSeries(cmd, cmd, jsonSeq.globals.interpolation[cmd]);
                            serObj[cmd] = newSer;
                        }
                        this.addSingleData(serObj[cmd], time, action[cmd]);
                    }
                }
            }
        }
    }

    getInterpolationFromName(name)
    {
        return this.globals.interpolation[name];
    }
}



