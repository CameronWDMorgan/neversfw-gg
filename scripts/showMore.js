async function artShowMoreFunction(session, showMoreArtAggregate, accounts, showMoreHtml, newContentList, contentListName, showMoreId) {
    showMoreArtAggregate.forEach(artwork => {
        showMoreHtml += '<div class="artPost">'
            showMoreHtml += '<div class="art-details" style="text-align: left !important; justify-content: left;">'
                for( let index = 0; index < accounts.length;) {
                    account = accounts[index]
                    if (account.accountId == artwork.accountId) {
                        
                        showMoreHtml += '<a href="https://www.neversfw.gg/user/' + account.username + '"><img class="home-profile-avatar" src="https://www.neversfw.gg/ugc/avatar/' + account.avatarUrl + '" width="32px" height="32px" loading="lazy">' + account.username + ':</a>'
                        
                        let date = new Date(Number(artwork.timestamp));
                        let day = date.getDate().toString().padStart(2, '0');
                        let month = (date.getMonth() + 1).toString().padStart(2, '0'); // add 1 to adjust for zero-based month index
                        let year = date.getFullYear();
                        let hour = date.getHours().toString().padStart(2, '0');
                        let minute = date.getMinutes().toString().padStart(2, '0');
                        let formattedDate = `${day}/${month}/${year}`;

                        showMoreHtml += '<a href="https://www.neversfw.gg/art/' + artwork.contentId + '">' + artwork.name + '</a>'
                        showMoreHtml += '<br>'
                        showMoreHtml += '<a style="position:absolute ;font-size: small; color: rgba(255, 255, 255, 0.5); transform: translateX(38px);">[' + formattedDate + ']</a>'
                        showMoreHtml += '<br>'
                        index = accounts.length +1
                    }
                    index++
                }
            showMoreHtml += '</div>'
            
            showMoreHtml += '<div class="art-gallery">'

                if (artwork.contentUrl.length == 1) {
                    var ext = artwork.contentUrl[0].slice(-3)
                    if (ext == "mp4" || ext == "mov" || ext == "wmv" || ext == "avi" || ext == "mkv" || ext == "ebm" || ext == "flv" || ext == ".rm") {
                        showMoreHtml += '<video class="art-piece-solo" controls>'
                            showMoreHtml += '<source src="' + artwork.contentUrl[0] + '" width="auto" height="100%">'
                            showMoreHtml += '</video>'
                    } else {
                        showMoreHtml += '<a class="art-piece-solo" target="_blank" href="https://www.neversfw.gg/art/' + artwork.contentId + '">'
                            showMoreHtml += '<img class="art-piece-solo" src="' + artwork.contentUrl[0] + '" width="auto" height="100%" loading="lazy">'
                            showMoreHtml += '</a>'
                    }

                } else {

                    artwork.contentUrl.forEach(artImage => {
                        var ext = artImage.slice(-3)
                        if (ext == "mp4" || ext == "mov" || ext == "wmv" || ext == "avi" || ext == "mkv" || ext == "ebm" || ext == "flv" || ext == ".rm") {
                            showMoreHtml += '<video class="art-piece" controls>'
                                showMoreHtml += '<source src="' + artImage + '" width="auto" height="100%">'
                            showMoreHtml += '</video>'
                        } else {
                            showMoreHtml += '<a class="art-piece" target="_blank" href="https://www.neversfw.gg/art/' + artwork.contentId + '">'
                                showMoreHtml += '<img  src="' + artImage + '" width="auto" height="100%" loading="lazy">'
                            showMoreHtml += '</a>'
                        }
                    })
                }



                showMoreHtml += '</div>'
            showMoreHtml += '<div class="art-below">'
                if (artwork.description) {
                    showMoreHtml += '<p class="artworkDescription">Description:' + artwork.description + '</p>'
                }
                showMoreHtml += '<div class="artworkTags" style="float: left; width: 100%; text-align: left !important; justify-content: left;">'
                    showMoreHtml += '<a>Tags: </a>'
                    artwork.tags.forEach(tag => {
                        tag = tag.replace('(author)','')
                        showMoreHtml += '<a><a href="https://www.neversfw.gg/search?searchTerm=' + tag + '">' + tag + '</a>, </a>'
                        
                    })
                showMoreHtml += '</div>'
                showMoreHtml += '<center>'
                    showMoreHtml += '<form class="likeForm" style="display:inline-flex">'
                        showMoreHtml += '<input name="contentId" type="hidden" value=' + artwork.contentId + '>'
                        showMoreHtml += '<input name="likes" type="hidden" value=' + artwork.likes.length + '>'
                        showMoreHtml += '<button type="submit" class="postButton">'
                            artworkIsLiked = false
                            for(artworkLikesIndex = 0; artwork.likes.length > artworkLikesIndex;) {
                                artworkLike = artwork.likes[artworkLikesIndex]
                                console.log(artworkLike)
                                if(artworkLike.accountId == session.accountId) {
                                    artworkIsLiked = true
                                }
                                artworkLikesIndex++
                            }

                            if(artworkIsLiked){
                                showMoreHtml += '<i class="fa fa-heart" style="color: rgb(0,255,255)"><a style="margin-left: 6px;" id="contentLikes' + artwork.contentId + '">' + artwork.likes.length + '</a></i>'
                            } else {
                                showMoreHtml += '<i class="fa fa-heart"><a style="margin-left: 6px;" id="contentLikes' + artwork.contentId + '">' + artwork.likes.length + '</a></i>'
                            }
                            
                    showMoreHtml += '    </button>'
                    showMoreHtml += '</form>'
                    showMoreHtml += '<form class="commentForm" style="display:inline-flex">'
                        showMoreHtml += '<input name="contentId" type="hidden" value=' + artwork.contentId + '>'
                        showMoreHtml += '<button type="submit" class="postButton">'
                            showMoreHtml += '<i class="fa fa-comment"><a style="margin-left: 6px;" id="contentCommentsCount' + artwork.contentId + '">' + artwork.comments.length + '</a></i>'
                        showMoreHtml += '</button>'
                        showMoreHtml += '<input name="comment" required class="commentBox" id="commentBox' + artwork.contentId + '" placeholder="Send Comment...">'
                    showMoreHtml += '</form>'
                    showMoreHtml += '<button class="toggle-comments-button" class="postButton" style="transform: translateY(-8px);">'
                        showMoreHtml += 'Hide/Show Comments'
                    showMoreHtml += '</button>'
                    showMoreHtml += '<div id="contentComments' + artwork.contentId + '" class="hidden">'
                        artwork.comments.reverse()
                        artwork.comments.forEach(comment => {
                            showMoreHtml += '<div class="comment" style="text-align: left !important; justify-content: left;">'
                                for( let index = 0; index < accounts.length;) {
                                    account = accounts[index]
                                    if (account.accountId == comment.accountId) {
                                        let date = new Date(Number(comment.timestamp));
                                        let day = date.getDate().toString().padStart(2, '0');
                                        let month = (date.getMonth() + 1).toString().padStart(2, '0'); // add 1 to adjust for zero-based month index
                                        let year = date.getFullYear();
                                        let hour = date.getHours().toString().padStart(2, '0');
                                        let minute = date.getMinutes().toString().padStart(2, '0');
                                        let formattedDate = `${day}/${month}/${year} ${hour}:${minute}`;
                                        showMoreHtml += '<a href="https://www.neversfw.gg/user/' + account.username + '" class="comment-details"><img class="home-profile-avatar" src="https://www.neversfw.gg/ugc/avatar/' + account.avatarUrl + '" width="32px" height="32px" loading="lazy">' + account.username + '   -  ' + formattedDate + '</a>'
                                        index = accounts.length +1
                                    }
                                    index++
                                }
                                showMoreHtml += '<p>' + comment.comment + '</p>'
                            showMoreHtml += '</div>'
                        })
                                            
                        showMoreHtml += '</div>'
                    showMoreHtml += '</center>'
                showMoreHtml += '</div>'
            showMoreHtml += '<br>'
        showMoreHtml += '</div>'
    })
showMoreHtml += '</div>'
showMoreHtml += '<div id="showMore" class="hidden">'
showMoreHtml += '</div>'


// Insert the new comment into the DOM
const showMoreDiv = document.getElementById(`${showMoreId}`)
showMoreDiv.classList.remove('hidden');
$(`#${showMoreId}`).append(`${showMoreHtml}`);
$(`#${contentListName}`).attr("value", `${newContentList}`)
}

async function gameShowMoreFunction(session, gameAggregate, accounts, showMoreHtml, newContentList, contentListName, showMoreId) {
    gameAggregate.forEach(game => {
            showMoreHtml += '<div class="game-container" style="width: 99%">'
                showMoreHtml += '<div class="game-text">'
                    showMoreHtml += '<a href="https://www.neversfw.gg/game/' + game.gameId + '">' + game.gameId + ' - v' + game.version + '</a>'
                showMoreHtml += '</div>'
                showMoreHtml += '<a class="game-thumbnail" href="https://www.neversfw.gg/game/' + game.gameId + '">'
                    showMoreHtml += '<img class="game-thumbnail" src="' + game.thumbnailUrl + '" width="auto" height="100%" loading="lazy">'
                showMoreHtml += '</a>'
                
            showMoreHtml += '</div>'
        $(`#${contentListName}`).attr("value", `${newContentList}`)
    })
    showMoreHtml += '</div>';
    showMoreHtml += '<div id="showMore" class="hidden">'
    showMoreHtml += '</div>'
    
    
    // Insert the new comment into the DOM
    const showMoreDiv = document.getElementById(`${showMoreId}`)
    showMoreDiv.classList.remove('hidden');
    $(`#${showMoreId}`).append(`${showMoreHtml}`);
}