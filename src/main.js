'use strict';

const express = require('express');
const stormpath = require('stormpath');
const config = require('config');
const BluebirdPromise = require("bluebird");
const url = require('url');
const querystring = require('querystring');
const crypto = require('crypto');
const createError = require('http-errors');
const httpErrors = require('http-errors-express');

const client = BluebirdPromise.promisifyAll(
    new stormpath.Client({
            apiKey: new stormpath.ApiKey(config.get('cloudpass.apiKey'), config.get('cloudpass.apiSecret')),
            baseUrl: config.get('cloudpass.baseUrl'),
            cacheOptions: {
                store: 'memory'
            }
    })
);

function qualifyHref(resource) {
    if (resource.href.startsWith('/')) {
        resource.href = config.get('cloudpass.baseUrl') + resource.href;
    }
    return resource;
}

function getApplication(id){
    return client.getApplicationAsync(
            `${config.get('cloudpass.baseUrl')}/applications/${id}`,
            {expand: 'customData'}
        )
        .then(qualifyHref);
}

express()
    .get('/:applicationId/login', (req, res) =>
        getApplication(req.params.applicationId)
            .then(application => {
                //verify signature
                if(req.query.sig !== crypto.createHmac('sha256', application.customData.discourse.ssoSecret).update(req.query.sso).digest('hex')){
                    throw createError(400, 'Invalid payload signature');
                }
                res.status(302)
                        .location(application.createIdSiteUrl({
                            path: '/#/',
                            state: req.query.sso,
                            callbackUri: `${config.has('server.baseUrl')?
                                            config.get('server.baseUrl'):
                                            //this URL will be incorrect if the application is behind a proxy and not mounted at the root level
                                            url.format({
                                                protocol: req.protocol,
                                                host: req.get('host')
                                            })}/${req.params.applicationId}/loginCallback`
                        }))
                        .end();
            })
            .catch(req.next)
    )
    .get('/:applicationId/loginCallback', (req, res) =>
        getApplication(req.params.applicationId)
            .then(application => BluebirdPromise.join(
                                    application,
                                    BluebirdPromise.promisify(application.handleIdSiteCallback, {context: application})(req.url)
                                )
            )
            .spread((application, idSiteResult) => {
                const ssoRequestPayload = querystring.parse(Buffer.from(idSiteResult.state, 'base64').toString('utf8'));
                const ssoResponse = Buffer.from(
                    querystring.stringify({
                        nonce: ssoRequestPayload.nonce,
                        email: idSiteResult.account.email,
                        external_id: idSiteResult.account.id,
                        username: idSiteResult.account.username,
                        name: idSiteResult.account.fullName
                    }),
                    'utf8'
                ).toString('base64');
                res.status(302)
                    .location(`${ssoRequestPayload.return_sso_url}?${querystring.stringify({
                        sso: ssoResponse,
                        sig: crypto.createHmac('sha256', application.customData.discourse.ssoSecret).update(ssoResponse).digest('hex')
                    })}`)
                    .end();
            })
            .catch(req.next)
    )
    .get('/:applicationId/logout', (req, res) =>
        getApplication(req.params.applicationId)
            .then(application => {
                res.status(302)
                    .location(application.createIdSiteUrl({
                        callbackUri: application.customData.discourse.logoutCallbackUri,
                        logout: true
                    }))
                    .end();
            })
            .catch(req.next)
    )
    .use(httpErrors.default())
    .listen(config.get('server.port'));