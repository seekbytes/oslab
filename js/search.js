let searchInput = document.querySelector('#searchInput'),
    searchResult = document.querySelector('#searchResult');

let dataJSON;

// add keydown listener, when user hit '/', it will focus on search input (Desktop)
window.addEventListener('keydown', function(event) {
    if (event.key === '/') {
        event.preventDefault()
        searchInput.focus()
    }
})
// add keydown listener, when user hit 'ESC', it will close search result and unfocus search input.
window.addEventListener('keydown', function(event) {
    if (event.keyCode === 27)
    {
        searchInput.value = '';
        searchResult.innerHTML = '';
        searchInput.blur()
    }
})
/**
 * Get the posts lists in json format.
 */
const getPostsJSON = async () => {
    let response = await fetch('/index.json')
    let data = await response.json()
    return data
}
/**
 * @param query, element.
 * query: the keyword that user given.
 * element: target element to show the result.
 */
const filterPostsJSON = (query, element) => {
    let result, itemsWithElement;
    query = new RegExp(query, 'ig')
    result = dataJSON.filter(item => query.test(item.syscall))
    itemsWithElement = result.map(item => (
        `<li class="search-result-item">
            <a href="${item.url}">
                ${item.title}
                <span class="icon">
                    <i class="fas fa-external-link-alt"></i>
                </span>
            </a>
        </li>`
    ))
    element.style.display = 'block';
    itemsWithElement.unshift(`<p class="is-size-7 px-2 py-2 has-text-dark">Premi 'ESC' per cancellare la ricerca.</p>`)
    element.innerHTML = itemsWithElement.join('');
}
/**
 * searchInputAction take two arguments, event and callback
 */ 
const searchInputAction = (event, callback) => {
    searchInput.addEventListener(event, callback)
}
/**
 * When user focus on the search input, function getPostsJSON called.
 */
searchInputAction('focus', () => getPostsJSON().then(data => dataJSON = data))
/**
 * filtering result with the query that user given on search input.
 */
searchInputAction('keyup', (event) => filterPostsJSON(event.target.value, searchResult))