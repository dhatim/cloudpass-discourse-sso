# cloudpass-discourse-sso

This application allows authenticating to Discourse with Cloudpass accounts.

## Installation
### Docker
[An image is available on Docker Hub](https://hub.docker.com/r/dhatim/cloudpass-discourse-sso/).
Simply run it with the right environment variables to configure it (see below).

### Git
 - Clone this repo
 - `npm install`
 - configure (see below)
 - `npm start`
 
 ## Configuration
 ### Application
 #### With environement variables
 
|          Name          | Required | Description
|          :---:         | :---:    | :---
| **CLOUDPASS_API_KEY**  | yes      | API key used to authenticate calls to cloudpass
|**CLOUDPASS_API_SECRET**| yes      | API key secret used to authenticate calls to cloudpass
|**CLOUDPASS_BASE_URL**  | yes      | Cloudpass URL
|**SERVER_PORT**         | no       | The port on which the application will listen. Defaults to 80
|**SERVER_BASE_URL**     | no       | URL on which the application is accessible. Used for building callback URLs. Required if the application is behind a proxy and not mounted at the root level

#### With a configuration file

These values can also be read from a configuration file. simply copy the file `config/custom-environment-variables.yaml` in a new file `config/local.yaml`, and edit it with the desired values

### Cloudpass

Add the following Custom Data in the Cloudpass Application:
```json
{
  "discourse":{
    "ssoSecret": "super_secret_stuff",
    "logoutCallbackUri": "http://discourse.example.com"
  }
}
```

- `ssoSecret` is secret shared with Discourse used to hash SSO payloads, it can be any string (c.f. [Discourse documentation](https://meta.discourse.org/t/official-single-sign-on-for-discourse) for more information
- `logoutCallbackUri` is the URL on which users must be redirected afer logout (e.g. the URL of your Discourse instance)

### Discourse

In `Settings > Login`:
- **enable sso**: yes
- **sso url**: Enter the URL on which this application is accessible, followed by `/{applicationId}/login` (e.g. `http:/discourse-sso.example.com/0485cf2-6032-49dd-b6ad-126e3ca8bd86/login`)
- **sso secret**: Enter the same secret as in the Application Custom Data

In `Settings > Users`:
- **logout redirect**: Enter the URL on which this application is accessible, followed by `/{applicationId}/logout` (e.g. `http:/discourse-sso.example.com/0485cf2-6032-49dd-b6ad-126e3ca8bd86/logout`)


## TODO
Add some tests
