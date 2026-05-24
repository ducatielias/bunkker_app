    // data.js
    const DEFAULT_LINKS = {
        "Tiempo": [
            { id: crypto.randomUUID(), title: "AEMET", url: "http://www.aemet.es/es/eltiempo/prediccion/municipios/torremanzanas-torre-de-les-macanes-la-id03132" },
            { id: crypto.randomUUID(), title: "Windy App", url: "https://www.windy.com/38.607/-0.419?38.533,-0.376,11" },
            { id: crypto.randomUUID(), title: "Ventusky", url: "https://www.ventusky.com/es/radar-mapa#p=38.591;-0.421;11" }
        ],
        "Tráfico y Noticias": [
            { id: crypto.randomUUID(), title: "DGT", url: "https://infocar.dgt.es/etraffic/" },
            { id: crypto.randomUUID(), title: "Incidencias de tráfico (DGT)", url: "https://infocar.dgt.es/etraffic/Incidencias?ca=10&provIci=3&caracter=acontecimiento&accion_consultar=Consultar&IncidenciasRETENCION=IncidenciasRETENCION&IncidenciasOBRAS=IncidenciasOBRAS&IncidenciasPUERTOS=IncidenciasPUERTOS&IncidenciasMETEOROLOGICA=IncidenciasMETEOROLOGICA&IncidenciasEVENTOS=IncidenciasEVENTOS&IncidenciasOTROS=IncidenciasOTROS&IncidenciasRESTRICCIONES=IncidenciasRESTRICCIONES&ordenacion=fechahora_ini-DESC" },
            { id: crypto.randomUUID(), title: "Google News", url: "https://news.google.com/home?hl=es&gl=ES&ceid=ES:es" }
        ],
        "Información extra": [
            { id: crypto.randomUUID(), title: "Weather Cloud", url: "https://app.weathercloud.net/map#8592819644" },
            { id: crypto.randomUUID(), title: "Meteored", url: "https://www.meteored.com/es/" },
            { id: crypto.randomUUID(), title: "Avamet", url: "https://www.avamet.org/mxo-i.php?id=c32m132e01" },
            { id: crypto.randomUUID(), title: "Rain Alarm", url: "https://www.rain-alarm.com/" },
            { id: crypto.randomUUID(), title: "Unwx Alarm", url: "https://www.unwx.app/pwa/" },
            { id: crypto.randomUUID(), title: "Wunderground", url: "https://www.wunderground.com/wundermap/?renderer=2&Units=english&zoom=8&lat=37.76834106&lon=37.76834106&wxstn=1&wxstnmode=tw&aq=0&aqvalue=NaN&radar=0&radarType=NaN&radaropa=0.7&satellite=0&satelliteopa=0.8&storm-cells=0&severe=0&severeopa=0.9&sst=0&sstopa=0.8&sstanom=0&sstanomopa=0.8&fronts=0&hur=0&models=0&modelsmodel=ecmwf&modelsopa=0.8&modelstype=SURPRE&lightning=0&fire=0&fireopa=0.9&firePerimeter=0&firePerimeterOpacity=0.9&smoke=0&smokeOpacity=0.9&rep=0&surge=0&tor=0&windstr=0&windstrDensity=undefined&windstreamSpeed=undefined&windstreamSpeedFilter=undefined&windstreamPalette=undefined&hurrArch=0&hurrArchBasin=undefined&hurrArchYear=undefined&hurrArchStorm=undefined" },
            { id: crypto.randomUUID(), title: "GVA 112", url: "https://www.112cv.gva.es/es/preemergencias-meteorologicas" },
            { id: crypto.randomUUID(), title: "Actividad Sísmica", url: "https://visualizadores.ign.es/tproximos" }
        ],
    };

    // 🔹 NUEVO: Enlaces por defecto para el MODO SECRETO
    const DEFAULT_SECRET_LINKS = {
        "Área Privada": [
            { id: crypto.randomUUID(), title: "Mi Nube", url: "https://www.dropbox.com" },
            { id: crypto.randomUUID(), title: "Notas Seguras", url: "https://keep.google.com" }
        ],
        "Contactos": [
            { id: crypto.randomUUID(), title: "Alicante69", url: "https://www.alicante69.com/" },
            { id: crypto.randomUUID(), title: "Choosescorts", url: "https://choosescorts.com/" },
            { id: crypto.randomUUID(), title: "Destacamos", url: "https://www.destacamos.net/listings.html" },
            { id: crypto.randomUUID(), title: "Emasex", url: "https://emasex.com/" },
            { id: crypto.randomUUID(), title: "Encantadoras", url: "https://www.encantadoras.com/" },
            { id: crypto.randomUUID(), title: "Escort advisor xxx", url: "https://www.escort-advisor.xxx/" },
            { id: crypto.randomUUID(), title: "Escorten", url: "https://escorten.net/" },
            { id: crypto.randomUUID(), title: "Loquosex", url: "https://www.loquosex.com/" },
            { id: crypto.randomUUID(), title: "Milanunciosex", url: "https://www.milanunciosex.com/" },
            { id: crypto.randomUUID(), title: "Milcitas", url: "https://milcitas.com/" },
            { id: crypto.randomUUID(), title: "Milescorts", url: "https://www.milescorts.es/" },
            { id: crypto.randomUUID(), title: "Milpasiones", url: "https://milpasiones.com/" },
            { id: crypto.randomUUID(), title: "Mundosexanuncio", url: "https://www.mundosexanuncio.com/" },
            { id: crypto.randomUUID(), title: "Nuevapasion", url: "https://nuevapasion.com/" },
            { id: crypto.randomUUID(), title: "Nuevoloquo", url: "https://www.nuevoloquo.ch/" },
            { id: crypto.randomUUID(), title: "Pasion.in", url: "https://pasion.in/" },
            { id: crypto.randomUUID(), title: "Pasionred.com", url: "https://pasionred.com/creators/home" }
            
        ],
        "Foros": [
            { id: crypto.randomUUID(), title: "Spalumi", url: "https://spalumi.com/" }
        ]
    };

    const DEFAULT_ENGINES = [
        { id: 'yandex', name: 'Yandex', url: 'https://yandex.com/search/?text={q}', domain: 'yandex.com', secret: false, enabled: true },
        { id: 'google', name: 'Google', url: 'https://www.google.com/search?q={q}', domain: 'google.com', secret: false, enabled: true },
        { id: 'bing', name: 'Bing', url: 'https://www.bing.com/search?q={q}', domain: 'bing.com', secret: false, enabled: true },
        { id: 'brave', name: 'Brave', url: 'https://search.brave.com/search?q={q}&source=web', domain: 'search.brave.com', secret: false, enabled: true },
        { id: 'startpage', name: 'Startpage', url: 'https://www.startpage.com/sp/search?q={q}', domain: 'startpage.com', secret: false, enabled: true },
        { id: 'kantan', name: 'Kantan', url: 'https://kantan.cat/search?q={q}&category_general=1&language=auto&time_range=&safesearch=0&theme=simple', domain: 'kantan.cat', secret: false, enabled: true },
        { id: 'openstreetmap', name: 'Openstreetmap', url: 'https://www.openstreetmap.org/search?query={q}&zoom=15&minlon=-0.4485511779785157&minlat=38.62072646382401&maxlon=-0.3826332092285156&maxlat=38.64228271260427#map=19/30.349325/-97.755917', domain: 'openstreetmap.org', secret: false, enabled: true },
        { id: 'topo', name: 'Topográfico', url: 'https://www.geamap.com/es/espana#zoom=5&lat=37.3&lon=-4.9&layer=6&overlays=FFFFFFFFFFFFFFFFFFFFFFFFFFFFF', domain: 'geamap.com', secret: false, enabled: true },
        { id: 'vk', name: 'VK', url: 'https://vk.com/search?q={q}', domain: 'vk.com', secret: true, enabled: true },
        { id: 'telegram', name: 'Telegram Tgs', url: 'https://tgsearch.su/?post_type=tg_channel&s={q}', domain: 'tgsearch.su', secret: true, enabled: true },
        { id: 'telegramchannel', name: 'Telegram Channel', url: 'https://telegramchannels.me/search?search={q}&type=all', domain: 'telegramchannels.me', secret: true, enabled: true },
        { id: 'medlineplus', name: 'Medlineplus', url: 'https://vsearch.nlm.nih.gov/vivisimo/cgi-bin/query-meta?v%3Aproject=medlineplus-spanish&v%3Asources=medlineplus-spanish-bundle&query={q}', domain: 'medlineplus.gov', secret: false, enabled: true },
        { id: 'bunkr', name: 'Bunkr Albums', url: 'https://bunkr-albums.io/?search={q}', domain: 'bunkr-albums.io', secret: true, enabled: true },
        { id: '24vids', name: '24vids', url: 'https://www.24vids.com/search/{q}', domain: '24vids.com', secret: true, enabled: true },
        { id: 'rumble', name: 'Rumble', url: 'https://rumble.com/search/all?q={q}', domain: 'rumble.com', secret: true, enabled: true },
        { id: 'simptown', name: 'SimpTown', url: 'https://simptown.su/search/{q}/sort/popular/dir/desc/page/1', domain: 'simptown.su', secret: true, enabled: true  },
        { id: 'annas', name: 'Annas Archive', url: 'https://es.annas-archive.li/search?q={q}', domain: 'es.annas-archive.li', secret: true, enabled: true },
        { id: 'archive', name: 'Archive Org', url: 'https://archive.org/search?query={q}', domain: 'archive.org', secret: true, enabled: true },
        { id: 'simpleicons', name: 'SimpleIcons', url: 'https://simpleicons.org/?q={q}', domain: 'simpleicons.org', secret: false, enabled: true }
    ];
