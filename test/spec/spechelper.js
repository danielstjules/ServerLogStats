beforeEach(function() {
  this.addMatchers({
    toBeInDescOrder: function() {
      var array = this.actual;
      var previous = array[0][1];

      for (var i = 1; i < array.length; i++) {
        if (array[i][1] > previous)
          return false;

        previous = array[i][1];
      }
      return true;
    }
  });
});
