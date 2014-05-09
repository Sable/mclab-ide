(function() {
  ko.bindingHandlers.contextMenu = {
    init: function (element, valueAccessor) {
      var value = valueAccessor();
      $(element).contextmenu({
        target: value.target,
        before: value.before,
        scopes: value.scopes || null,
        onItem: function (context, e) {
          var data = ko.dataFor(context.first().get()[0]);
          var action = $(e.target).text();
          value.onItem(action, data ? data : context);
        }
      });
    }
  };

  ko.bindingHandlers.beforeUnloadText = {
    init: function (element, valueAccessor) {
      $(window).on('beforeunload', function() {
        var value = ko.unwrap(valueAccessor());
        if (value && value !== null) {
          return value;
        }
      });
    }
  };
})();
