$(document).ready(function() {

    var autocompleteEnabled = true; // Flag to enable or disable autocomplete

    // Function to fetch tags data
    function fetchTagsData() {
        return $.ajax({
            url: '/get-tags',
            dataType: 'json'
        });
    }

    function split(val) {
        return val.split(/,\s*/);
    }
    function extractLast(term) {
        return split(term).pop();
    }

    function setupAutocomplete(selector, tagsData) {
        $(selector)
            .on("keydown", function(event) {
                if (event.ctrlKey && (event.keyCode === 38 || event.keyCode === 40)) {
                    autocompleteEnabled = false; // Disable autocomplete when adjusting AI strength
                }
                if (event.keyCode === $.ui.keyCode.TAB && $(this).autocomplete("instance").menu.active) {
                    event.preventDefault();
                }
            })
            .on("keyup", function(event) {
                if (event.keyCode === 17) { // CTRL key
                    autocompleteEnabled = true; // Re-enable autocomplete after CTRL key is released
                }
            }).autocomplete({
            source: function(request, response) {
                if (!autocompleteEnabled) {
                    response([]); // Return empty if autocomplete is disabled
                    return;
                }
                var textarea = $(selector);
                var cursorPos = textarea.get(0).selectionStart;
                var text = textarea.val();
                var leftText = text.substring(0, cursorPos);
                var rightText = text.substring(cursorPos);
    
                var leftWordMatch = leftText.match(/[\w]+$/);
                var rightWordMatch = rightText.match(/^[\w]*/);
    
                var searchTerm = (leftWordMatch ? leftWordMatch[0] : '') + (rightWordMatch ? rightWordMatch[0] : '');
                searchTerm = searchTerm.toLowerCase();
    
                let suggestions = [];
    
                Object.entries(tagsData).forEach(([key, value]) => {
                    if (key.toLowerCase().startsWith(searchTerm)) {
                        suggestions.push(key + ' (' + value.score + ')');
                    }
                });
    
                // Sort and limit the suggestions
                suggestions.sort((a, b) => {
                    let scoreA = parseInt(a.match(/\((\d+)\)$/)[1], 10);
                    let scoreB = parseInt(b.match(/\((\d+)\)$/)[1], 10);
                    return scoreB - scoreA;
                });
    
                response(suggestions.slice(0, 5));
            },

            select: function(event, ui) {
                var textarea = $(selector);
                var cursorPos = textarea.get(0).selectionStart;
                var text = textarea.val();
                var leftText = text.substring(0, cursorPos);
                var rightText = text.substring(cursorPos);
            
                var leftWordMatch = leftText.match(/[\w]+$/);
                var rightWordMatch = rightText.match(/^[\w]*/);
            
                var replaceLength = (leftWordMatch ? leftWordMatch[0].length : 0) + (rightWordMatch ? rightWordMatch[0].length : 0);
                var actualTag = ui.item.value.split(' (')[0];
            
                // Determine the appropriate text to append
                var appendText = "";
                if (rightText.startsWith(" ")) {
                    appendText = ","; // Add just a comma if rightText starts with a space
                } else {
                    appendText = ", "; // Add comma and space otherwise
                }
            
                var newText = leftText.substring(0, leftText.length - (leftWordMatch ? leftWordMatch[0].length : 0)) + actualTag + appendText + rightText.substring(rightWordMatch ? rightWordMatch[0].length : 0);
                textarea.val(newText);
            
                // Update the cursor position to be after the inserted tag and appendText
                var newCursorPos = cursorPos - replaceLength + actualTag.length + appendText.length;
                textarea.get(0).selectionStart = textarea.get(0).selectionEnd = newCursorPos;
            
                return false;
            },

            open: function( event, ui ) {
                /* document.getElementById(...).addClass is not a function please rewrite it: */
                spaceID = document.getElementById('autocomplete-space')
                spaceID.classList.add('autocomplete-open');
            },
            close: function( event, ui ) {
                /* document.getElementById(...).removeClass is not a function please rewrite it: */
                spaceID = document.getElementById('autocomplete-space')
                spaceID.classList.remove('autocomplete-open');
            },
            search: function() {
                var term = extractLast(this.value);
                if (term.length = 0) {
                    return false;
                }
            },
            focus: function (event, ui) {
                event.preventDefault();
                
                var menu = $(this).data('ui-autocomplete').menu.element;
                menu.find('li').removeClass('custom-highlight');
                
                var index = ui.item ? menu.find('li:contains("' + ui.item.value + '")').index() : -1;
                if(index !== -1){
                    menu.find('li').eq(index).addClass('custom-highlight');
                }
            },
            position: selector === '#negativeprompt' ? { my: "left+50 bottom", at: "left top-215", collision: "none" } : { my: "left+50 bottom", at: "left top-75", collision: "none" },        }).data('ui-autocomplete')._renderItem = function (ul, item) {
            var term = extractLast(this.term);
            var re = new RegExp("(" + $.ui.autocomplete.escapeRegex(term) + ")", "gi");
            var highlightedValue = item.label.replace(re, "<strong>$1</strong>");
            return $("<li>")
                .addClass('ui-menu-item')
                .append("<div class='ui-menu-item-wrapper'>" + highlightedValue + "</div>")
                .appendTo(ul);
        };

        $(selector).on('autocompleteclose', function () {
            $(this).data('ui-autocomplete').menu.element.find('li').css({
                'background-color': '',
                'color': '',
                'font-weight': ''
            });
        });
    }

    // Fetch tags data and setup autocomplete
    fetchTagsData().done(function(tagsData) {
        setupAutocomplete('#prompt', tagsData);
        setupAutocomplete('#negativeprompt', tagsData);
    });
});