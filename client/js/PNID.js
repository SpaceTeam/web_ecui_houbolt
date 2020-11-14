var val = 0;
var igniterActive = false;

const VALVE_STATUS_PALETTE = {
	FAILURE: "#8e2024",
	OPEN: "#ce670b",
	BETWEEN: "#CE9822",
	CLOSE: "#1f9723"
};

const PIPE_STATUS_PALETTE = {
	PRESSURIZED_OX: "#0079ce",
	DEPRESSURIZED_OX: "#aaaaaa",
	PRESSURIZED_FUEL: "#8e2024",
	DEPRESSURIZED_FUEL: "#aaaaaa"
};

const VALVE_STATUS_THRESHOLDS = {
	OPEN: [81,100],
	BETWEEN: [21,80],
	CLOSE: [0,20]
}

const SENSOR_STATUS_PALETTE = {
	CRITICAL_HIGH: "#8e2024",
	HIGH: "#ce670b",
	NOMINAL: "#1f9723",
	LOW: "#0079ce",
	CRITICAL_LOW: "#8e2024"
};

const SENSOR_STATUS_THRESHOLDS = {
	oxVenturiPressure: [5, 40],
	fuelVenturiPressure: [5, 30],
	oxTankPressure: [5, 40],
	fuelTankPressure: [5, 30],
	chamberPressure: [5, 20],
	thrust_Sum: [50,400],
};

$('#pnid').find(".pnid-solenoid input").each(function (elem) {
	$(this).change();
});

$('.pnid-sensor .pnid-input').on('change',function() {
	let id = this.parentNode.id;
	//strip pnid
	id = id.replace("pnid-","");
	if (SENSOR_STATUS_THRESHOLDS.hasOwnProperty(id))
	{
		if (this.value.match(/-?[\d.]+/)[0] < SENSOR_STATUS_THRESHOLDS[id][0])
		{
			$(this.parentNode).find("*").css("border-color", SENSOR_STATUS_PALETTE.LOW);
			$(this.parentNode).find("*").css("color", SENSOR_STATUS_PALETTE.LOW);
		}
		else if (this.value.match(/-?[\d.]+/)[0] > SENSOR_STATUS_THRESHOLDS[id][1])
		{
			$(this.parentNode).find("*").css("border-color", SENSOR_STATUS_PALETTE.HIGH);
			$(this.parentNode).find("*").css("color", SENSOR_STATUS_PALETTE.HIGH);
		}
		else
		{
			$(this.parentNode).find("*").css("border-color", SENSOR_STATUS_PALETTE.NOMINAL);
			$(this.parentNode).find("*").css("color", SENSOR_STATUS_PALETTE.NOMINAL);
		}

	}
	else
	{
		console.error("pressure sensor in status object not found!");
	}

});

function updatePNID(name, value)
{
	if (name.includes("DepressSolenoid"))
	{
		$("#pnid-" + name).find(".pnid-input").each(function () {

			this.value = value ? "Close" : "Open";
			$(this).change();
		});
	}
	else if (name.includes("Solenoid"))
	{
		$("#pnid-" + name).find(".pnid-input").each(function () {

			this.value = value ? "Open" : "Close";
			$(this).change();
		});
	}
	else if (name.includes("igniter"))
	{
		igniterActive = value;
	}
	else
	{
		$("#pnid-" + name.replace(" ", "_")).find(".pnid-input").each(function () {
			this.value = value.toFixed(2);
			$(this).change();
		});
		$("#pnid-" + name.substring(0, name.length - 2)).find(".pnid-input").each(function () {
			this.value = value.toFixed(0);
			$(this).change();
		});
	}
}

document.getElementById("pnid-oxPressSolenoid").onchange = function () {
	$(".pnid-oxPipes").each(function () {
		//console.log(this)
		if ($("#pnid-oxDepressSolenoid").find(".pnid-input")[0].value === "Close" &&
			$("#pnid-oxPressSolenoid").find(".pnid-input")[0].value === "Open")
		{
			$(this).css("border-left", "7px solid " + PIPE_STATUS_PALETTE.PRESSURIZED_OX);
			//$(this).css("box-shadow", "0px 0px 5px 2px " + PIPE_STATUS_PALETTE.PRESSURIZED);
		}
		else
		{
			$(this).css("border-left", "5px solid " + PIPE_STATUS_PALETTE.DEPRESSURIZED_OX);
			//$(this).css("box-shadow", "none");
		}
	});
	$("#pnid-oxTank").find(".pnid-input").each(function () {
		if ($("#pnid-oxDepressSolenoid").find(".pnid-input")[0].value === "Close" &&
			$("#pnid-oxPressSolenoid").find(".pnid-input")[0].value === "Open")
		{
			this.value = "Pressurized";
		}
		else
		{
			this.value = "Depressurized";
		}
		$(this).change();
	});
};

document.getElementById("pnid-fuelPressSolenoid").onchange = function () {
	$(".pnid-fuelPipes").each(function () {
		//console.log(this)
		if ($("#pnid-fuelDepressSolenoid").find(".pnid-input")[0].value === "Close" &&
			$("#pnid-fuelPressSolenoid").find(".pnid-input")[0].value === "Open")
		{
			$(this).css("border-left", "7px solid " + PIPE_STATUS_PALETTE.PRESSURIZED_FUEL);
			//$(this).css("box-shadow", "0px 0px 5px 2px " + PIPE_STATUS_PALETTE.PRESSURIZED);
		}
		else
		{
			$(this).css("border-left", "5px solid " + PIPE_STATUS_PALETTE.DEPRESSURIZED_FUEL);
			//$(this).css("box-shadow", "none");
		}
	});
	$("#pnid-fuelTank").find(".pnid-input").each(function () {
		if ($("#pnid-fuelDepressSolenoid").find(".pnid-input")[0].value === "Close" &&
			$("#pnid-fuelPressSolenoid").find(".pnid-input")[0].value === "Open")
		{
			this.value = "Pressurized";
		}
		else
		{
			this.value = "Depressurized";
		}
		$(this).change();
	});
};

document.getElementById("pnid-fuelMainValve").onchange = function (evt) {
	//only fuel main valve is checking for ignition
	if (evt.target.value >= VALVE_STATUS_THRESHOLDS.OPEN[0] &&
		$("#pnid-oxMainValve").find(".pnid-input")[0].value >= VALVE_STATUS_THRESHOLDS.OPEN[0] &&
		$("#pnid-fuelDepressSolenoid").find(".pnid-input")[0].value === "Close" &&
		$("#pnid-fuelPressSolenoid").find(".pnid-input")[0].value === "Open" &&
		$("#pnid-oxDepressSolenoid").find(".pnid-input")[0].value === "Close" &&
		$("#pnid-oxPressSolenoid").find(".pnid-input")[0].value === "Open")
	{
		ignitePNID(true);
	}
	else
	{
		ignitePNID(false);
	}
	$(".pnid-injectorFuelPipes").each(function () {

		if (evt.target.value >= VALVE_STATUS_THRESHOLDS.OPEN[0] &&
			$("#pnid-fuelDepressSolenoid").find(".pnid-input")[0].value === "Close" &&
			$("#pnid-fuelPressSolenoid").find(".pnid-input")[0].value === "Open")
		{
			$(this).css("border-left", "7px solid " + PIPE_STATUS_PALETTE.PRESSURIZED_FUEL);
			//$(this).css("box-shadow", "0px 0px 5px 2px " + PIPE_STATUS_PALETTE.PRESSURIZED);
		}
		else
		{
			$(this).css("border-left", "5px solid " + PIPE_STATUS_PALETTE.DEPRESSURIZED_FUEL);
			//$(this).css("box-shadow", "none");
		}
	});
};

document.getElementById("pnid-oxMainValve").onchange = function (evt) {
	$(".pnid-injectorOxPipes").each(function () {

		if (evt.target.value >= VALVE_STATUS_THRESHOLDS.OPEN[0] &&
			$("#pnid-oxDepressSolenoid").find(".pnid-input")[0].value === "Close" &&
			$("#pnid-oxPressSolenoid").find(".pnid-input")[0].value === "Open")
		{
			$(this).css("border-left", "7px solid " + PIPE_STATUS_PALETTE.PRESSURIZED_OX);
			//$(this).css("box-shadow", "0px 0px 5px 2px " + PIPE_STATUS_PALETTE.PRESSURIZED);
		}
		else
		{
			$(this).css("border-left", "5px solid " + PIPE_STATUS_PALETTE.DEPRESSURIZED_OX);
			//$(this).css("box-shadow", "none");
		}
	});
};

function ignitePNID(ignite)
{
	if (ignite && igniterActive)
	{
		$('#injectorExhaust').removeAttr('hidden');
	}
	else
	{
		$('#injectorExhaust').attr('hidden','true');
	}
}

// setInterval(function () {
// 	val = (val + 1) % 100;
// 	//console.log($("#pnid-oxSuperchargeValve").find(".pnid-label"))
//
// 	$(".pnid-pressure").find(".pnid-input").each(function () {
// 		//console.log(this.parentNode)
// 		this.value = (val+0.1234).toFixed(2) ;
// 		$(this).change();
// 	});
// }, 100);

// setInterval(function () {
// 	val = (val + 1) % 100;
// 	//console.log($("#pnid-oxSuperchargeValve").find(".pnid-label"))
// 	$("#pnid-oxSuperchargeValve,#pnid-oxVentValve, #pnid-oxMainValve, #pnid-fuelMainValve").find(".pnid-input").each(function () {
// 		//console.log(this.parentNode)
// 		this.value = val;
// 		$(this).change();
// 	});
// 	$(".pnid-pressure").find(".pnid-input").each(function () {
// 		//console.log(this.parentNode)
// 		this.value = (val+0.1234).toFixed(2) + " bar";
// 		$(this).change();
// 	});
// 	$("#pnid-oxDepressSolenoid, #pnid-fuelDepressSolenoid").find(".pnid-input").each(function () {
// 		//console.log(this)
// 		this.value = val > 70 ? "Open" : "Close";
// 		$(this).change();
// 	});
// 	$("#pnid-oxPressSolenoid, #pnid-fuelPressSolenoid").find(".pnid-input").each(function () {
// 		//console.log(this)
// 		this.value = val <= 70 ? "Open" : "Close";
// 		$(this).change();
// 	});
// 	$("#pnid-oxTank, #pnid-fuelTank").find(".pnid-input").each(function () {
// 		//console.log(this)
// 		this.value = val <= 70 ? "Pressurized" : "Depressurized";
// 		$(this).change();
// 	});
// 	$(".pnid-oxPipes").each(function () {
// 		//console.log(this)
// 		if (val <= 70){
// 			$(this).css("border-left", "7px solid " + PIPE_STATUS_PALETTE.PRESSURIZED_OX);
// 			//$(this).css("box-shadow", "0px 0px 5px 2px " + PIPE_STATUS_PALETTE.PRESSURIZED);
// 		}
// 		else
// 		{
// 			$(this).css("border-left", "5px solid " + PIPE_STATUS_PALETTE.DEPRESSURIZED_OX);
// 			//$(this).css("box-shadow", "none");
// 		}
// 	});
// 	$(".pnid-fuelPipes").each(function () {
// 		//console.log(this)
// 		if (val <= 70){
// 			$(this).css("border-left", "7px solid " + PIPE_STATUS_PALETTE.PRESSURIZED_FUEL);
// 			//$(this).css("box-shadow", "0px 0px 5px 2px " + PIPE_STATUS_PALETTE.PRESSURIZED);
// 		}
// 		else
// 		{
// 			$(this).css("border-left", "5px solid " + PIPE_STATUS_PALETTE.DEPRESSURIZED_FUEL);
// 			//$(this).css("box-shadow", "none");
// 		}
// 	});
// 	$(".pnid-injectorOxPipes").each(function () {
// 		//console.log(this)
// 		if (val > 50 && val < 70){
// 			$(this).css("border-left", "7px solid " + PIPE_STATUS_PALETTE.PRESSURIZED_OX);
// 			//$(this).css("box-shadow", "0px 0px 5px 2px " + PIPE_STATUS_PALETTE.PRESSURIZED);
// 		}
// 		else
// 		{
// 			$(this).css("border-left", "5px solid " + PIPE_STATUS_PALETTE.DEPRESSURIZED_OX);
// 			//$(this).css("box-shadow", "none");
// 		}
// 	});
// 	$(".pnid-injectorFuelPipes").each(function () {
// 		//console.log(this)
// 		if (val > 50 && val < 70){
// 			$(this).css("border-left", "7px solid " + PIPE_STATUS_PALETTE.PRESSURIZED_FUEL);
// 			$('#injectorExhaust').removeAttr('hidden');
// 			//$(this).css("box-shadow", "0px 0px 5px 2px " + PIPE_STATUS_PALETTE.PRESSURIZED);
// 		}
// 		else
// 		{
// 			$(this).css("border-left", "5px solid " + PIPE_STATUS_PALETTE.DEPRESSURIZED_FUEL);
// 			$('#injectorExhaust').attr('hidden','true');
// 			//$(this).css("box-shadow", "none");
// 		}
// 	});
// }, 100);

function onPNIDInputChange(input)
{
	if (input.hasAttribute("unit"))
	{
		input.value = input.value + " " + input.getAttribute("unit");
	}

	let par = input.parentNode;
	if ($(par).hasClass( "pnid-solenoid" ))
	{
		$(par).find(".triangle").each(function () {
			if (parseInt(input.value) === 0 || input.value.toLowerCase() === "close")
			{
				$(this).css("border-left-color", VALVE_STATUS_PALETTE.CLOSE);
				$(input).css("color", VALVE_STATUS_PALETTE.CLOSE);
			}
			else
			{
				$(this).css("border-left-color", VALVE_STATUS_PALETTE.OPEN);
				$(input).css("color", VALVE_STATUS_PALETTE.OPEN);
			}

		})
	}
	else if ($(par).hasClass( "pnid-motor-valve" ))
	{
		$(par).find(".triangle").each(function () {
			if (input.value <= VALVE_STATUS_THRESHOLDS.CLOSE[1])
			{
				$(this).css("border-left-color", VALVE_STATUS_PALETTE.CLOSE);
				$(input).css("color", VALVE_STATUS_PALETTE.CLOSE);
			}
			else if (input.value <= VALVE_STATUS_THRESHOLDS.BETWEEN[1])
			{
				$(this).css("border-left-color", VALVE_STATUS_PALETTE.BETWEEN);
				$(input).css("color", VALVE_STATUS_PALETTE.BETWEEN);
			}
			else
			{
				$(this).css("border-left-color", VALVE_STATUS_PALETTE.OPEN);
				$(input).css("color", VALVE_STATUS_PALETTE.OPEN);
			}

		})
	}
	else if ($(par).hasClass( "pnid-tank-ox" ))
	{
		$(par).find(".square, .half-oval").each(function () {
			if (input.value.toLowerCase() === "depressurized")
			{
				$(this).css("background-color", PIPE_STATUS_PALETTE.DEPRESSURIZED_OX);
			}
			else if (input.value.toLowerCase() === "pressurized")
			{
				$(this).css("background-color", PIPE_STATUS_PALETTE.PRESSURIZED_OX);
			}

		})
	}
	else if ($(par).hasClass( "pnid-tank-fuel" ))
	{
		$(par).find(".square, .half-oval").each(function () {
			if (input.value.toLowerCase() === "depressurized")
			{
				$(this).css("background-color", PIPE_STATUS_PALETTE.DEPRESSURIZED_FUEL);
			}
			else if (input.value.toLowerCase() === "pressurized")
			{
				$(this).css("background-color", PIPE_STATUS_PALETTE.PRESSURIZED_FUEL);
			}

		})
	}

}