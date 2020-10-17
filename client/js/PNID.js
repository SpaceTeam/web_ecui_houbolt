var val = 0;

const VALVE_STATUS_PALETTE = {
	OPEN: "#8e2024",
	BETWEEN: "#CE9822",
	CLOSE: "#1f9723"
};

const VALVE_STATUS_THRESHOLDS = {
	OPEN: [81,100],
	BETWEEN: [21,80],
	CLOSE: [0,20]
}

setInterval(function () {
	val = (val + 1) % 100;
	//console.log($("#pnid-oxSuperchargeValve").find(".pnid-label"))
	$("#pnid-oxSuperchargeValve,#pnid-oxVentValve, #pnid-oxMainValve, #pnid-fuelMainValve").find(".pnid-input").each(function () {
		//console.log(this.parentNode)
		this.value = val;
		$(this).change();
	});
	$("#pnid-oxDepressSolenoid, #pnid-fuelDepressSolenoid").find(".pnid-input").each(function () {
		//console.log(this)
		this.value = val > 70 ? "Open" : "Close";
		$(this).change();
	});
	$("#pnid-oxPressSolenoid, #pnid-fuelPressSolenoid").find(".pnid-input").each(function () {
		//console.log(this)
		this.value = val <= 70 ? "Open" : "Close";
		$(this).change();
	});
	$("#pnid-oxTank, #pnid-fuelTank").find(".pnid-input").each(function () {
		//console.log(this)
		this.value = val <= 70 ? "Pressurized" : "Depressurized";
		$(this).change();
	});
}, 100);

function onPNIDInputChange(input)
{
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
	else if ($(par).hasClass( "pnid-tank" ))
	{
		$(par).find(".square, .half-oval").each(function () {
			if (input.value.toLowerCase() === "depressurized")
			{
				$(this).css("background-color", VALVE_STATUS_PALETTE.CLOSE);
			}
			else if (input.value.toLowerCase() === "pressurized")
			{
				$(this).css("background-color", VALVE_STATUS_PALETTE.OPEN);
			}

		})
	}

}