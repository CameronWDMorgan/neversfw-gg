$(document).ready(function() {
    $('.showMoreForm').each(function(index, form) {
        $(form).submit(function(event) {
            // Prevent the form from submitting normally
            event.preventDefault();
    
            // Get the form data
            var formData = $(this).serialize();

            let searchTerm = $('input[name="searchTerm"]').val()
            formData = (formData + `&searchTerm=${searchTerm}`)

            let accountId = $('input[name="accountId"]').val()
            formData = (formData + `&accountId=${accountId}`)
    
            // Send a POST request to the server

            console.log(formData)

            $.ajax({
                type: 'POST',
                url: '/showMore',
                data: formData,


                success: async function(response) {

                    // Handle the server's response
                    formData = formData.split('&')
                    pageTypeAlways = formData[0].slice(9)

                    isLoadingContent = false; // Reset flag to false when content is loaded

                    console.log()

                    if (response.endOfContent) {
                        var pageTypeObject = pageTypes.find(pt => pt.name === pageTypeAlways);
                        if (pageTypeObject) {
                            pageTypeObject.valid = false;
                            return
                        }
                    }

                    let newContentList = response.newContentList
                    var showMoreHtml = ''
                    let accounts = response.accounts
                    let showMoreAggregate = response.responseAggregate
                    let session = response.session

                    if(response.pageType == "homePopular") {
                        await artShowMoreFunction(session, showMoreAggregate, accounts, showMoreHtml, newContentList, 'contentListhomePopular', 'showMorehomePopular')
                    }

                    if(response.pageType == "homeRecent") {
                        await artShowMoreFunction(session, showMoreAggregate, accounts, showMoreHtml, newContentList, 'contentListhomeRecent', 'showMorehomeRecent')
                    }

                    if(response.pageType == "homeFollowing") {
                        await artShowMoreFunction(session, showMoreAggregate, accounts, showMoreHtml, newContentList, 'contentListhomeFollowing', 'showMorehomeFollowing')
                    }

                    if(response.pageType == "gameHomeRecent") {
                        await gameShowMoreFunction(session, showMoreAggregate, accounts, showMoreHtml, newContentList, 'contentListgameHomeRecent', 'showMoregameHomeRecent')
                    }

                    if(response.pageType == "searchArt") {
                        await artShowMoreFunction(session, showMoreAggregate, accounts, showMoreHtml, newContentList, 'contentListsearchArt', 'showMoresearchArt')
                    }

                    if(response.pageType == "searchGame") {
                        await gameShowMoreFunction(session, showMoreAggregate, accounts, showMoreHtml, newContentList, 'contentListsearchGame', 'showMoresearchGame')
                    }

                    if(response.pageType == "userArt") {
                        await artShowMoreFunction(session, showMoreAggregate, accounts, showMoreHtml, newContentList, 'contentListuserArt', 'showMoreuserArt')
                    }

                    if(response.pageType == "userGame") {
                        await gameShowMoreFunction(session, showMoreAggregate, accounts, showMoreHtml, newContentList, 'contentListuserGame', 'showMoreuserGame')
                    }
                    

                    $('.commentForm').each(function(index, form) {
                        if (!$(form).data('submitEventBound')) {
                            commentFunction(index, form)
                            $(form).data('submitEventBound', true);
                        }
                    });

                    $('.likeForm').each(function(index, form) {
                        if (!$(form).data('submitEventBound')) {
                            likeFunction(index, form)
                            $(form).data('submitEventBound', true);
                        }
                    });

                    toggleButtons()
                },
                error: function(xhr, status, error) {
                    // Handle error
                    isLoadingContent = false; // Reset flag even if there's an error
                }
            });
        });
    });
});