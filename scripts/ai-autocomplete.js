$(document).ready(function() {
    function split(val) {
        return val.split(/,\s*/);
    }
    function extractLast(term) {
        return split(term).pop();
    }

    $('#prompt').on("keydown", function(event) {
        if (event.keyCode === $.ui.keyCode.TAB && $(this).autocomplete("instance").menu.active) {
            event.preventDefault();
        }
    }).autocomplete({
        source: function(request, response) {
            $.ajax({
                url: '/autocomplete',
                dataType: 'json',
                data: {
                    term: extractLast(request.term)
                },
                success: function(data) {
                    response(data);
                }
            });
        },
        open: function( event, ui ) {
            console.log($(this).closest('form'))
            $(this).closest('form').addClass('autocomplete-open');
        },
        close: function( event, ui ) {
            $(this).closest('form').removeClass('autocomplete-open');
        },
        search: function() {
            var term = extractLast(this.value);
            if (term.length < 2) {
                return false;
            }
        },
        focus: function (event, ui) {
            // prevent value inserted on focus
            event.preventDefault();
            
            // Get the autocomplete widget menu element
            var menu = $(this).data('ui-autocomplete').menu.element;

            // Remove highlight from any previously focused item
            menu.find('li').removeClass('custom-highlight');
            
            // Find the index of the currently focused item
            var index = ui.item ? menu.find('li:contains("' + ui.item.value + '")').index() : -1;

            // Add highlight to the currently focused item if it exists
            if(index !== -1){
                menu.find('li').eq(index).addClass('custom-highlight');
            }
        },
        select: function(event, ui) {
            var terms = split(this.value);
            // remove the current input
            terms.pop();
            // add the selected item
            actual_tag = ui.item.value.replace(/ \(\d+\)/g, '');
            // actual_tag = actual_tag.replace(/_/g, " ");
            actual_tag = actual_tag.trim()
            terms.push(actual_tag);
            // add placeholder to get the comma-and-space at the end
            terms.push("");
            this.value = terms.join(", ");
            return false;
        },
        position: { my: "left+50 bottom", at: "left top-20", collision: "none" },
    }).data('ui-autocomplete')._renderItem = function (ul, item) {
        // Highlight the matching part
        var term = extractLast(this.term);
        var re = new RegExp("(" + $.ui.autocomplete.escapeRegex(term) + ")", "gi");
        var highlightedValue = item.label.replace(re, "<strong>$1</strong>");
        return $("<li>")
            .addClass('ui-menu-item') // Ensure this is consistent with jQuery UI's default classing
            .append("<div class='ui-menu-item-wrapper'>" + highlightedValue + "</div>")
            .appendTo(ul);
    };
    // Reset styles when the menu is closed
    $('#prompt').on('autocompleteclose', function () {
        $(this).data('ui-autocomplete').menu.element.find('li').css({
            'background-color': '',
            'color': '',
            'font-weight': ''
        });
    });
})