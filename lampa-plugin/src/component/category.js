/**
 * Scrob custom category viewer component.
 * Pattern: kinobaza/myperson/component.js — Lampa.Maker.make('Category')
 * Reads items from Lampa 'favorite' storage by custom_key.
 */

function component(object) {
    var comp = Lampa.Maker.make('Category', object)

    comp.use({
        onCreate: function () {
            // Read custom category items from favorite storage
            var favorite = Lampa.Storage.get('favorite', '{}')
            if (typeof favorite === 'string') {
                try { favorite = JSON.parse(favorite) } catch (e) { favorite = {} }
            }

            var ids = Array.isArray(favorite[object.custom_key]) ? favorite[object.custom_key] : []
            var cards = Array.isArray(favorite.card) ? favorite.card : []

            var results = []
            for (var i = 0; i < ids.length; i++) {
                for (var j = 0; j < cards.length; j++) {
                    if (cards[j].id == ids[i]) {
                        results.push(cards[j])
                        break
                    }
                }
            }

            var json = { results: results, total_pages: 1, page: 1 }

            if (results.length === 0) {
                this.empty()
            } else {
                this.build(json)
            }
        },

        onInstance: function (card, element) {
            card.use({
                onlyEnter: function () {
                    Lampa.Activity.push({
                        url: '',
                        title: element.title || element.name,
                        component: 'full',
                        card: element,
                        page: 1
                    })
                },
                onLong: function () {
                    // Long press: remove from this category
                    var enabledCtrl = Lampa.Controller.enabled().name

                    Lampa.Select.show({
                        title: Lampa.Lang.translate('scrob_cat_remove_confirm'),
                        items: [
                            { title: Lampa.Lang.translate('scrob_cat_remove'), _remove: true },
                            { title: Lampa.Lang.translate('cancel'), cancel: true }
                        ],
                        onSelect: function (item) {
                            if (!item._remove) {
                                Lampa.Controller.toggle(enabledCtrl)
                                return
                            }

                            Lampa.Favorite.remove(object.custom_key, element)
                            Lampa.Noty.show(Lampa.Lang.translate('scrob_cat_removed'))
                            Lampa.Activity.replace(object)
                        },
                        onBack: function () {
                            Lampa.Controller.toggle(enabledCtrl)
                        }
                    })
                }
            })
        }
    })

    return comp
}

export default component
