class SensorChart
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

        // Create chart instance
        this.chart = am4core.create(id, am4charts.XYChart);

        if (name != null) {
            var title = this.chart.titles.create();
            title.text = name;
            title.fontSize = 15;
            title.marginBottom = 10;
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
    addSeries(seriesName, yValueName, strokeColor=undefined)
    {
        // Create series
        var series = this.chart.series.push(new am4charts.LineSeries());

        series.name = seriesName;
        series.dataFields.valueY = yValueName;
        series.dataFields.valueX = "time";
        series.tooltipText = "{name}: [bold]{valueY}[/]";
        series.strokeWidth = 1.5;
        series.minBulletDistance = 15;
        series.tooltip.getFillFromObject = false;
        series.tooltip.label.fill = am4core.color("#FFFFFF");


        //series.fillOpacity = 0.1;
        series.hiddenInLegend = true;
        //series.stroke = strokeColor;
        series.fill = strokeColor;
        //series.tooltip.background.fill = strokeColor;
        var range = this.xAxis.createSeriesRange(series);
        range.value = 10000;
        range.endValue = 20000;

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

        this.chart.scrollbarX = new am4core.Scrollbar();
        this.chart.scrollbarX.parent = this.chart.bottomAxesContainer;
        // this.chart.events.on("ready", function () {
        //     this.xAxis.zoom({start:0, end:1});
        // });
    }

    removeContent()
    {
        this.chart.data = [];
    }

    addSingleData(series, valueX, valueY)
    {
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
}



