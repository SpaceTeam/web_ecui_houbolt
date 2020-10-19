var val = 0;

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

function updatePNID(jsonSensor)
{
	$("#pnid-" + jsonSensor.name).find(".pnid-input").each(function () {
		this.value = jsonSensor.value.toFixed(2);
		$(this).change();
	});
	$("#pnid-" + jsonSensor.name.substring(0,jsonSensor.name.length-2)).find(".pnid-input").each(function () {
		this.value = jsonSensor.value.toFixed(0);
		$(this).change();
	});
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
	if (evt.target.value <= VALVE_STATUS_THRESHOLDS.CLOSE[1])
	{
		ignitePNID(false);
	}
};

document.getElementById("pnid-oxMainValve").onchange = function (evt) {
	if (evt.target.value <= VALVE_STATUS_THRESHOLDS.CLOSE[1])
	{
		ignitePNID(false);
	}
};

function ignitePNID(ignite)
{
	if (ignite)
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