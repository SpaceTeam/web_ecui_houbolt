var rangeSlider = function(){
  var slider = $('.range-slider'),
      range = $('.range-slider__range'),
      value = $('.range-slider__value');

  slider.each(function(){

    value.each(function(){
      var value = $(this).prev().attr('value');
      $(this).html(value);
    });

    range.on('input', function(){
      $('#' + this.id + 'Val').html(this.value);
    });
  });
};

rangeSlider();

var minInput = $("#fuelServoMin");
var maxInput = $("#fuelServoMax");
var minMaxTester = $("#fuelServo");
minInput.on("change", function (event) {
    minMaxTester.attr("min", minInput.val());
    console.log(Math.min(Math.max(minMaxTester.val(), minInput.val()), maxInput.val()));
    minMaxTester.val(Math.min(Math.max(minMaxTester.val(), minInput.val()), maxInput.val()));
    minMaxTester.trigger('input');
});
maxInput.on("change", function (event) {
    minMaxTester.attr("max", maxInput.val());
    console.log(Math.min(Math.max(minMaxTester.val(), minInput.val()), maxInput.val()));
    minMaxTester.val(Math.min(Math.max(minMaxTester.val(), minInput.val()), maxInput.val()));
    minMaxTester.trigger('input');
});

$("input[type='number']").inputSpinner();
