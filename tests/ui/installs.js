/*
    Test for app installs using the mozApps mock.
    Such as button states, UA tracking.
*/
var appList = require('../lib/app_list');
var helpers = require('../lib/helpers');
var mozApps = require('../lib/mozApps');
var _ = require('../../node_modules/underscore');


var installAttributionTestDefs = [
    // Definitions for testing that install attributions are sent as a custom
    // dimension for app installs.
    {
        name: 'Category New',
        path: '/category/games/?sort=reviewed',
        attribution: 'games-new',
    },
    {
        name: 'Category Popular',
        path: '/category/games/',
        attribution: 'games-popular',
    },
    {
        name: 'Detail',
        path: '/app/tracking/',
        attribution: 'detail',
        src: 'direct',
    },
    {
        name: 'New',
        path: '/new/',
        attribution: 'new',
    },
    {
        name: 'Popular',
        path: '/popular/',
        attribution: 'popular',
    },
    {
        name: 'Recommended',
        path: '/recommended/',
        attribution: 'reco',
    },
    {
        name: 'Search',
        path: '/search/',
        attribution: 'search',
    },
    {
        name: 'Brand landing',
        path: '/feed/editorial/brand-slug',
        attribution: 'branded-editorial-element',
        attributionSlug: 'brand-slug'
    },
    {
        name: 'Collection landing',
        path: '/feed/collection/coll-slug',
        attribution: 'collection-element',
        attributionSlug: 'coll-slug'
    },
    {
        name: 'Shelf landing',
        path: '/feed/shelf/shelf-slug',
        attribution: 'operator-shelf-element',
        attributionSlug: 'shelf-slug'
    },
];


function assertUAInstall(test, name, app, dimensions) {
    // Helper assert that attaches static dimensions relative to the app.
    dimensions = _.extend({
        dimension6: app.name,
        dimension7: app.id + '',
        dimension8: app.author,
        dimension10: app.payment_required ? 'paid' : 'free',
    }, dimensions || {});

    helpers.assertUASendEvent(test, [
        name,
        dimensions.dimension10,
        app.UALabel,
        dimensions
    ]);
}


casper.test.begin('Test mozApps mock', {
    test: function(test) {
        helpers.startCasper();

        helpers.waitForPageLoaded(function() {
            test.assert(casper.evaluate(function() {
                return window.require('core/capabilities').webApps;
            }), 'Check mozApps mock is working');
        });

        helpers.done(test);
    }
});


casper.test.begin('Test install app', {
    test: function(test) {
        helpers.startCasper('/app/free');

        helpers.waitForPageLoaded(function() {
            casper.click('.install');
        });

        // Test that it changed to a launch button.
        casper.waitForSelector('.launch', function() {
            test.assertSelectorHasText('.launch', 'Open');

            // Re-navigate.
            casper.click('.privacy-policy a');
        });

        casper.waitWhileSelector('[data-page-type~="detail"]', function() {
            casper.back();
        });

        // Test that it is still a launch button.
        casper.waitForSelector('.launch', function() {
            test.assertSelectorHasText('.launch', 'Open');

            test.assert(casper.evaluate(function() {
                return window.require('core/z').apps.length == 1;
            }), 'Test install recorded in z.apps');
        });

        helpers.done(test);
    }
});


casper.test.begin('Test install packaged app', {
    test: function(test) {
        helpers.startCasper('/app/packaged');

        helpers.waitForPageLoaded(function() {
            casper.click('.install');
        });

        casper.waitForSelector('.launch', function() {
            test.assertSelectorHasText('.launch', 'Open');
        });

        helpers.done(test);
    }
});


casper.test.begin('Test mark uninstalled apps on visibilitychange', {
    test: function(test) {
        helpers.startCasper('/app/someapp');

        helpers.waitForPageLoaded(function() {
            casper.click('.install');
        });

        casper.waitForSelector('.launch', function() {
            casper.evaluate(function() {
                window.navigator.mozApps._resetInstalled();
                window.require('core/z').doc.trigger('visibilitychange');
            });

        });

        casper.waitWhileSelector('.launch', function() {
            test.assertDoesntExist('.launch');
        });

        helpers.done(test);
    }
});


casper.test.begin('Test UA when installing from app details page', {
    test: function(test) {
        helpers.startCasper('/app/tracking');

        // Manually do the dimensions here for better coverage.
        var dimensions = {
            dimension6: 'Tracking',
            dimension7: '1234',
            dimension8: 'Tracking',
            dimension9: 'direct',
            dimension10: 'free',
            dimension16: 'detail'
        };

        var app;
        helpers.waitForPageLoaded(function() {
            app = appList.getAppData('.install');
            casper.click('.install');

            helpers.assertUASendEvent(test, [
                'Click to install app',
                'free',
                app.UALabel,
                dimensions
            ]);
        });

        casper.waitForSelector('.launch', function() {
            helpers.assertUASendEvent(test, [
                'Successful app install',
                'free',
                app.UALabel,
                dimensions
            ]);
        });

        helpers.done(test);
    }
});


installAttributionTestDefs.forEach(function(testDef) {
    casper.test.begin('Test UA when installing from ' + testDef.name, {
        test: function(test) {
            helpers.startCasper(testDef.path);

            var customDimensions = {
                dimension16: testDef.attribution
            };
            if (testDef.src) {
                customDimensions.dimension9 = testDef.src;
            }
            if (testDef.attributionSlug) {
                customDimensions.dimension17 = testDef.attributionSlug;
            }

            var app;
            helpers.waitForPageLoaded(function() {
                app = appList.getAppData('.install');
                casper.click('.install');

                assertUAInstall(test,
                    'Click to install app',
                    app,
                    customDimensions
                );
            });

            casper.waitForSelector('.launch', function() {
                assertUAInstall(test,
                    'Click to install app',
                    app,
                    customDimensions
                );
            });

            helpers.done(test);
        }
    });
});


installAttributionTestDefs.forEach(function(testDef) {
    casper.test.begin('Test UA source when following ' + testDef.name + ' to detail page', {
        test: function(test) {
            helpers.startCasper(testDef.path);

            var customDimensions = {
                dimension9: testDef.src ? 'direct' : testDef.attribution,
                dimension16: 'detail',
            };

            var app;
            helpers.waitForPageLoaded(function() {
                app = appList.getAppData('.mkt-tile:first-child .install');
                casper.click('.mkt-tile:first-child');
            });

            casper.waitForSelector('[data-page-type~="detail"] .install', function() {
                casper.click('.install');
                assertUAInstall(test,
                    'Click to install app',
                    app,
                    customDimensions
                );
            });

            casper.waitForSelector('.launch', function() {
                assertUAInstall(test,
                    'Click to install app',
                    app,
                    customDimensions
                );
            });

            helpers.done(test);
        }
    });
});
