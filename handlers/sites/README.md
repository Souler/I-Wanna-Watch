# Content Site Handlers
Each file in this directory should be a module in charge of handling at least one content site.
Every content site handler should have at least this properties among their exports:
* [handles](#handles)
* [login(params, cb)](#login)
* [search(query, cb)](#search)
* [tvshow(id, cb)](#tvshow)
* [episode(id, cb)](#episode)

<a name="handles" />
## handles
`Array` of `String` contaning all hostnames this module can handle.
```javascript
[
	"some.content.site.com"
]
```

<a name="login" />
## login(params, cb)
Async function which returns through the `cb` function an error if anything went wrong during the process or `undefined` otherwise.

<a name="search" />
## search(query, cb)
Async function which returns through the `cb` function an error if anything went wrong during the process or an `Array` of `Object` representing all the the shows that matched the given `query` in that site. Each show `Object` needs to be as follows.
```javascript
{
    id: 'some-show', // site internal id, usable later by tvshow function
    title: 'Some Show',
    thumbnail: null // this might be null or a full URL
}
```

<a name="tvshow" />
## tvshow(id, cb)
Async function which returns through the `cb` function an error if anything went wrong during the process or an `Array` of `Object` representing all seasons of the show identified by `id` available at that site. Also, each season `Object` contains its name and an `Array` of available episodes. Each season `Object` needs to be as follows.
```javascript
{
    name: 'Season 1',
    episodes: [
    	{
    		id: '0u78123sa', // site internal id, usable later by episode function
    		number: 1, // Cardinal of the episode among his season
    		title: 'Something Happens'
    	},
    	...
    ]
}
```

<a name="episode" />
## episode(id, cb)
Async function which returns through the `cb` function an error if anything went wrong during the process or an `Array` of `Object` representing all the external links for the episode identified by `id`. Each external link `Object` needs to be as follows.
```javascript
{
    href: 'http://some.video.hosting.com/qsdfvg1', // full url of external video hosting service
    subtitles: false, // Lang of subtitles, false if no subtitles present 
    language: 'english', // Lang of the episode
}
```