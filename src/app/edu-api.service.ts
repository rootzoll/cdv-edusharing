import { Injectable } from '@angular/core';
import { Http, Response, RequestOptions, Headers , RequestOptionsArgs} from '@angular/http';
import { Observable } from 'rxjs/Observable';

import { 
    Tools,
    CollectionContent, 
    CollectionReference,
    Node, 
    Reference, 
    Property, 
    Collection, 
    Person,
    Permissions, 
    LocalPermissions,
    Organization,
    PersonalProfile,
    GETCOLLECTIONS_SCOPE
} from './edu-api.data';

/**
 * Data Class to use With API
 * @Christan
 */
export class oAuthTokens {
    public activated :boolean;
    public accessToken :string;
    public refreshToken :string;
    public expiresIn :number;
    public lastRefresh :number;

    public cleanData() : void {
        this.activated  = false;
        this.accessToken = null;
        this.refreshToken = null;
        this.expiresIn  = 0;
        this.lastRefresh  = 0;
    }

    public mapFromJsonResponse(res: Response) : void {
        this.activated = true;
        this.accessToken = res.json().access_token;
        this.refreshToken = res.json().refresh_token;
        this.expiresIn = res.json().expires_in;
        this.lastRefresh = new Date().getTime();
    }
}

@Injectable()
export class EduApiService {

  /*
   * API SETTINGS
   */

  // a list of possible endpoints to API for service to iterate thru
  private apiEndpointReachedOnce:boolean = false; // true if endpoint delivered any othe then 404
  private apiEndpointWorkedOnce:boolean = false; // true if endpoint deliveres data also behind oAuth
  private possibleApiEndpointsIndex = 0;
  // please order: first relative path, then local machines, then on the open net
  private possibleApiEndpoints : string[] = [   
      "./../rest/",
      "http://alfresco5.vm:8080/edu-sharing/rest/",
      "http://appserver7.metaventis.com:7116/edu-sharing/rest/"
  ];

  // the actual set API base url (use first in list)
  private apiBaseUrl:string = this.possibleApiEndpoints[this.possibleApiEndpointsIndex];

  /*
   * PRIVATE OAUTH DATA
   */

  private oAuthData :oAuthTokens;
  private oAuthClientId :string = "eduApp";
  private oAuthClientSecret :string = "secret";
  private oAuthTokensRefreshStream : any = null;

  /*
   * Service Constructor (get HTTP injected)
   */
  constructor(private http: Http) {
      this.oAuthData = new oAuthTokens();
      this.oAuthData.cleanData();
  }

    /****
     * PUBLIC METHODS - SETUP & AUTHENTIFICATION
     ****/

    /**
     * Use to set your custom API endpoint ...
     * @param newBaseurl should start with "https://" and end with "/rest/"
     * @returns {Observable} true if endpoint is reachable, false if not and throws error when url not https
     */
    setupApiEndpointBaseUrl (newBaseUrl:string) : Observable<boolean> {

        // try if new endpoint is reachable
        return Observable.create( observer => {

            // check that url is secure
            newBaseUrl = newBaseUrl.trim();
            if (newBaseUrl.startsWith("http://")) {
                observer.error("setApiEndpointBaseUrl: newBaseurl needs to be a https URL for security reasons.");
                observer.complete();
                return;
            }

            // reset old oAuth data
            this.oAuthData.cleanData();

            // set new endpoint as only option
            this.apiEndpointReachedOnce = false;
            this.apiEndpointWorkedOnce = false;
            this.possibleApiEndpointsIndex = 0;
            this.possibleApiEndpoints = [
                newBaseUrl
            ];

            this.findWorkingApiBaseUrl().subscribe( result => {
                observer.next(result);
                observer.complete();
            } );
        });
    }

    setUpIsWorking() : boolean {
        return (this.apiEndpointReachedOnce && this.apiEndpointWorkedOnce);
    }

    public static INIT_WITH_USERPASSPROMT_FALLBACK:boolean = true;
    public static INIT_WITH_NO_FALLBACK:boolean = false;

    /**
     * Use to check once if auth on API by JSession is working.
     * @param oAuthPromtFallback set to true if you in production use JSession, but during development you want to fall back to oAuth with user/pass promt
     * @returns {Observable} delivers true if JSession (or fallback) is working, false if not, throws error on other network problems
     */
    oAuthInitWithJSessionFlow (oAuthPromtFallback:boolean) : Observable<boolean> {

        return Observable.create( observer => {

            // check if access with JSession (when exists) to an API endpoint works
            this.basicApiHeaderConfig().subscribe( headers => {

                this.http.get(this.apiBaseUrl+'iam/v1/people/-home-/-me-',{
                    headers: headers
                }).subscribe(

                    // WIN
                    (res: Response) => {

                        // OK - was able to get data from endpoint - JSession is working
                        this.apiEndpointWorkedOnce = true;
                        observer.next(true);
                        observer.complete();
                    },

                    // FAIL
                    error => {

                        if ((error.status) && (error.status==401)) {

                            // JSession is not working

                            if (oAuthPromtFallback) {

                                // fallback oAuth with getting username and password from user

                                // get username and password from user thru alert promts
                                var user = prompt("Username for "+this.apiBaseUrl, "");
                                var pass = prompt("Password for "+user+"@"+this.apiBaseUrl+")", "");

                                this.getAuthTokenByUsernameAndPassword(user,pass).subscribe( result => {
                                    observer.next(result);
                                    observer.complete();
                                });

                            } else {

                                // return FALSE - JSession-Auth not working
                                observer(false);
                                observer.complete();

                            }

                        } else {

                            // any other code then 401 unauthorized is an error - not a fail
                            observer.error("HTTP ERROR --> "+JSON.stringify(error));
                            observer.complete();

                        }

                    }
                );

            } );

        });
    }

    /**
     * Use this init auth when your app asks your user for username and password.
     * @param username
     * @param password
     * @returns {Observable} true if user/pass was correct, false if not and throws errors on other network problems
     */
    oAuthInitWithUsernameAndPasswordFlow (username:string, password:string) : Observable<boolean> {

        return Observable.create( observer => {

          // check data input
          if ((username==null) || (password==null)) {
              console.warn("oAuthInitWithUsernameAndPasswordFlow: username and password cannot be NULL");
              observer.error("username or passward cannot be NULL");
              observer.complete();
              return;
          }

          this.getAuthTokenByUsernameAndPassword(username, password)
              .subscribe( result => {
                  observer.next(result);
                  observer.complete();
              });

      });

    }

    /**
     * Use to get oAuth tokens after success init to store it.
     * @returns {oAuthTokens}
     */
    oAuthGetTokensForPersitence () : oAuthTokens {
        return this.oAuthData;
    }

    /**
     * Use to set oAuth tokens after restart from persistence.
     */
    oAuthSetTokensFromPersistence(tokens:oAuthTokens) : void {
        this.oAuthData = tokens;
    }

    /**
     * Use for persistence to keep updated if tokens get refreshed.
     * @param callBackOnTokenRefresh a function that will be called with oAuthData object as parameter on refresh
     */
    oAuthGetTokenRefreshStream() : Observable<oAuthTokens> {

        return Observable.create( observer => {
            this.oAuthTokensRefreshStream = observer;
        });

    }

    /****
     * PUBLIC METHODS - API
     ****/

    public getOwnProfile() : Observable<PersonalProfile> {

        return Observable.create( observer => {

            this.basicApiHeaderConfig().subscribe( headers => {

                var url = this.apiBaseUrl+'iam/v1/people/-home-/-me-';

                this.http.get(url,{
                    headers: headers
                }).subscribe(
                    // WIN
                    (res: Response) => {
                        observer.next(PersonalProfile.fromJSON(res.json().person));
                        observer.complete();
                    },
                    // FAIL
                    error => {
                        this.handleApiError(url, observer, error);
                    }
                );

            });
        });
    }

    public createCollection(title:string, description:string="", repoId:string="-home-", parentCollectionId:string="-root-", scope:string="MY", color:string="#759CB7", imageReference:string = null) : Observable<Collection> {

        return Observable.create( observer => {

            // check input
            if (title==null) {
                observer.error("title cannot be null");
                observer.complete();
                return;
            }

            this.basicApiHeaderConfig().subscribe( headers => {

                // special headers for this call
                headers.append('Accept', 'text/html');
                headers.append('Content-Type','application/json');

                var url:string = this.apiBaseUrl+'collection/v1/collections/'+repoId+'/'+parentCollectionId+'/children';

                if (imageReference!=null) alert("todo: figure out how to add image to collection data body: "+imageReference);

                var bodyData:string = '{"title": "'+title+'","description": "'+description+'", "type": "default", "color" : "'+color+'"}';

                // TODO: ACCESS on SCOPE

                this.http.post(
                    url,
                    bodyData,
                    {headers: headers}).subscribe(
                    // WIN
                    (res: Response) => {
                        observer.next(Collection.fromJSON(res.json().collection));
                        observer.complete();
                    },
                    // FAIL
                        error => {
                        console.log("If you get a 400 error - please check if you have 'authentication.ticket.useSingleTicketPerUser=false' in your ./tomcat/shared/classes/alfresco-global.properties");
                        this.handleApiError(url, observer, error);
                    }
                );

            });
        });
    }

    // get metadata of a single collection
    public getCollectionMetadata(collectionId:string, repoId:string="-home-") : Observable<Collection> {
        return Observable.create( observer => {

            this.basicApiHeaderConfig().subscribe( headers => {

                var url = this.apiBaseUrl+'collection/v1/collections/'+repoId+'/'+collectionId;

                this.http.get(url,{
                    headers: headers
                }).subscribe(
                    // WIN
                    (res: Response) => {
                        let result:Collection = Collection.fromJSON(res.json().collection);
                        observer.next( result );
                        observer.complete();
                    },
                    // FAIL
                    error => {
                        this.handleApiError(url, observer, error);
                    }
                );

            });
        });
    }

        // get metadata of a single collection
    public updateCollection(collection:Collection) : Observable<void> {
        return Observable.create( observer => {
            
            this.basicApiHeaderConfig().subscribe( headers => {

                // special headers for this call
                headers.append('Accept', 'text/plain');
                headers.append('Content-Type','application/json');

                var repo = "-home-";
                if ((collection.ref.repo!=null) && (collection.ref.repo!="local")) repo = collection.ref.repo;
                var url:string = this.apiBaseUrl+'collection/v1/collections/'+repo+'/'+collection.ref.id;
                var bodyData:string = JSON.stringify(collection);

                // console.log("updateCollection BODY DATA:");
                // console.log(bodyData);

                this.http.put(
                    url,
                    bodyData,
                    {headers: headers}
                ).subscribe(
                    // WIN
                    (res: Response) => {                        
                        observer.next( null );
                        observer.complete();
                    },
                    // FAIL
                    error => {
                        this.handleApiError(url, observer, error);
                    }
                );

            });
        });
    }

    // deletes a collection with all its sub collections (content does not get deleted)
    public deleteCollection(collectionId:string, repoId:string="-home-") : Observable<void> {
        return Observable.create( observer => {
            this.basicApiHeaderConfig().subscribe( headers => {
                var url = this.apiBaseUrl+'collection/v1/collections/'+repoId+'/'+collectionId;
                this.http.delete(url,{
                    headers: headers
                }).subscribe(
                    // WIN
                    (res: Response) => {
                        observer.next( null );
                        observer.complete();
                    },
                    // FAIL
                    error => {
                        this.handleApiError(url, observer, error);
                    }
                );
            });
        });
    } 

    // adds a node reference to a collection
    public addToCollection(nodeId:string, collectionId:string, repoId:string="-home-") : Observable<void> {
        return Observable.create( observer => {
            this.basicApiHeaderConfig().subscribe( headers => {
                var url = this.apiBaseUrl+'collection/v1/collections/'+repoId+'/'+collectionId+"/references/"+nodeId;
                this.http.put(url,{
                    headers: headers
                }).subscribe(
                    // WIN
                    (res: Response) => {
                        observer.next( null );
                        observer.complete();
                    },
                    // FAIL
                    error => {
                        this.handleApiError(url, observer, error);
                    }
                );
            });
        });
    } 

    // removes a reference form a collection
    public removeFromCollection(referenceId:string, collectionId:string, repoId:string="-home-") : Observable<void> {
        return Observable.create( observer => {
            this.basicApiHeaderConfig().subscribe( headers => {
                var url = this.apiBaseUrl+'collection/v1/collections/'+repoId+'/'+collectionId+"/references/"+referenceId;
                this.http.delete(url,{
                    headers: headers
                }).subscribe(
                    // WIN
                    (res: Response) => {
                        observer.next( null );
                        observer.complete();
                    },
                    // FAIL
                    error => {
                        this.handleApiError(url, observer, error);
                    }
                );
            });
        });
    } 

    // sort collections and content by alphabet
    private sortByAlphabet(a:Collection,b:Collection) : number {
        var result = 0;
        var i = 0;
        while (
            (result == 0) &&
            (i < a.title.length) &&
            (i < b.title.length)) {
            result = a.title.charCodeAt(i) - b.title.charCodeAt(i);
            i++;
        }
        return result;
    };
        
    // get children and content of a collection
    // the collection object within return value of CollectionContent gets not loaded
    // thats done so that cached data can be used - if you need it use getCollectionMetadata afterwards
    public getCollectionContent(scope:GETCOLLECTIONS_SCOPE, parentCollectionId:string="-root-", repoId:string="-home-") : Observable<CollectionContent> {

        return Observable.create( observer => {

            this.basicApiHeaderConfig().subscribe( headers => {

                let scopeStr = "";
                if (scope==GETCOLLECTIONS_SCOPE.MY) scopeStr = "MY";
                if (scope==GETCOLLECTIONS_SCOPE.GROUPS) scopeStr = "EDU_GROUPS";
                if (scope==GETCOLLECTIONS_SCOPE.ALL) scopeStr = "EDU_ALL";
                if (scopeStr=="") {
                    this.handleApiError(url, observer, "scope is not a known/supported enum value");
                    return;
                }
 
                var url = this.apiBaseUrl+'collection/v1/collections/'+repoId+'/'+parentCollectionId+'/children?scope='+scopeStr;

                this.http.get(url,{
                    headers: headers
                }).subscribe(
                    // WIN
                    (res: Response) => {
                        
                        // get result data
                        let result:CollectionContent = CollectionContent.fromJSON(res.json());

                        // set id of base collection if needed
                        if (result.collection==null) result.setCollectionID(parentCollectionId);

                        // sort collections by alphabet
                        result.collections.sort(this.sortByAlphabet);

                        // retuern results
                        observer.next( result );
                        observer.complete();
                    },
                    // FAIL
                    error => {
                        this.handleApiError(url, observer, error);
                    }
                );

            });
        });
    }

    // get permissions on a node, folder or collection
    getPermissions(nodeId:string, repoId:string="-home-") : Observable<Permissions>  {

        return Observable.create( observer => {

            this.basicApiHeaderConfig().subscribe( headers => {
 
                var url = this.apiBaseUrl+'node/v1/nodes/'+repoId+'/'+nodeId+'/permissions';
                
                this.http.get(url,{
                    headers: headers
                }).subscribe(
                    // WIN
                    (res: Response) => {
                        let result:Permissions = Permissions.fromJSON(res.json().permissions);
                        observer.next( result );
                        observer.complete();
                    },
                    // FAIL
                    error => {
                        this.handleApiError(url, observer, error);
                    }
                );

            });
        });
    }

    // set permissions on a node, folder or collection
    setPermissions(localPermissions:LocalPermissions, nodeId:string, repoId:string="-home-") : Observable<void> {

        return Observable.create( observer => {

            this.basicApiHeaderConfig().subscribe( headers => {

                headers.append('Content-Type', 'application/json');
 
                var url = this.apiBaseUrl+'node/v1/nodes/'+repoId+'/'+nodeId+'/permissions';
                var bodyData:string = JSON.stringify(localPermissions);

                this.http.put(url, bodyData, {
                    headers: headers
                }).subscribe(
                    // WIN
                    (res: Response) => {
                        observer.next();
                        observer.complete();
                    },
                    // FAIL
                    error => {
                        this.handleApiError(url, observer, error);
                    }
                );

            });
        });
    }

    // get the organization available
    getOrganizations(repoId:string="-home-") : Observable<Array<Organization>> {

        return Observable.create( observer => {

            this.basicApiHeaderConfig().subscribe( headers => {
 
                var url = this.apiBaseUrl+'organization/v1/organizations/'+repoId;
                
                this.http.get(url,{
                    headers: headers
                }).subscribe(
                    // WIN
                    (res: Response) => {
                        let result:Array<Organization> = Tools.fromJSONArray<Organization>(res.json().organizations, Organization.fromJSON);
                        observer.next( result );
                        observer.complete();
                    },
                    // FAIL
                    error => {
                        this.handleApiError(url, observer, error);
                    }
                );

            });
         
        });
    }

    httpGET(url:string) : Observable<string> {
        return Observable.create( observer => {
            this.http.get(url).subscribe(
                // WIN
                (res: Response) => {
                    //console.log(JSON.stringify(res));
                    observer.next(res.text());
                    observer.complete();
                },
                // FAIL
                error => {
                    this.handleApiError(url, observer, error);
                }
            );
        });
    }

    getRenderSnippetForContent(content:CollectionReference) : Observable<string> {
              return Observable.create( observer => {

            this.basicApiHeaderConfig().subscribe( headers => {
 /*
            var result:string = `<style type="text/css">
@import "../../theme/default/css/dynamic.css"
</style>

<div class="edusharing_rendering_wrapper">
	<div class="edusharing_rendering_metadata_top"><span class="edusharing_rendering_metadata_top_toggle edusharing_rendering_cursor_pointer" onclick="toggle_edusharing_rendering_metadata()">Informationen ein-/ausblenden</span></div>
		<div id="edusharing_rendering_metadata">
		<div class="edusharing_rendering_metadata_header">
			<span class="edusharing_rendering_metadata_header_x edusharing_rendering_cursor_pointer" onclick="close_edusharing_rendering_metadata()">X</span>
			Bildschirmfoto 2016-09-15 um 13.11.31.png		</div>
		<div class="edusharing_rendering_metadata_body">
<label class="edusharing_rendering_metadata_body_label">Creator</label><span class="edusharing_rendering_metadata_body_value">admin</span><label class="edusharing_rendering_metadata_body_label">Version</label><span class="edusharing_rendering_metadata_body_value">1.0</span><label class="edusharing_rendering_metadata_body_label">Repository id</label><span class="edusharing_rendering_metadata_body_value">repo</span><label class="edusharing_rendering_metadata_body_label">License</label><span class="edusharing_rendering_metadata_body_value">-</span>		</div>
	</div>	<div class="edusharing_rendering_content_wrapper">
		<h1>Öffnen des Objekts leider nicht möglich.</h1>
		Um das Objekt trotzdem zu benutzen, können Sie es herunterladen.<br><br>
		<a href="http://appserver7.metaventis.com:7116/esrender/modules/cache/doc/2016/09/15/12/55/11/9aa24595-4b68-4f3f-851c-0e4a271f5b5a1.0?ESSID=7cppje9jbpso979v0te85458j7&amp;token=ff7fad0d69f2aba7960f2189659aa0d4" target="_blank" class="edusharing_rendering_content">Download</a>
	</div>
</div>

<script>
	function toggle_edusharing_rendering_metadata() {
		var el = document.getElementById('edusharing_rendering_metadata');
		el.style.display = (el.style.display != 'none' ? 'none' : '' );
	}
	
	function close_edusharing_rendering_metadata() {
		document.getElementById('edusharing_rendering_metadata').style.display = 'none';
		return true;
	}
</script>`;


            observer.next( result );
            observer.complete();

*/
                var url = this.apiBaseUrl+'rendering/v1/details/-home-/'+content.ref.id;

                this.http.get(url,{
                    headers: headers
                }).subscribe(
                    // WIN
                    (res: Response) => {
                        let result:string = res.json().detailsSnippet;
                        observer.next( result );
                        observer.complete();
                    },
                    // FAIL
                    error => {
                        this.handleApiError(url, observer, error);
                    }
                );

            });

        }); 

    } 

    public uploadCollectionImage(collectionId:string, file:File, mimeType:string, repoId:string = "-home-"):Observable<void> {
        return Observable.create( observer => {

            var url = this.apiBaseUrl+"collection/v1/collections/"+repoId+"/"+collectionId+"/icon?mimetype=image%2Fpng"; //+encodeURI(mimeType);

            try {

                // TODO reimplement with Angular2 HTTP when multipart/form-data is well supported

                var xhr:XMLHttpRequest = new XMLHttpRequest();
                xhr.onreadystatechange = () => {
                    if (xhr.readyState === 4) {
                        if (xhr.status === 200) {
                            observer.next();
                            observer.complete();
                        } else {
                            this.handleApiError(url, observer, xhr.response);
                        }
                    }
                };

                xhr.open('POST', url, true);
                xhr.setRequestHeader("Accept","application/json");
                xhr.setRequestHeader("Authorization","Bearer "+this.oAuthData.accessToken);
                let formData = new FormData();
                formData.append("file", file, file.name);
                xhr.send(formData);

            } catch (e) {
                this.handleApiError(url, observer, e);
            } 

        });
    } 

    /****
     * PRIVATE METHODS
     ****/

    // standard error handling method for public API calls
    private handleApiError(url:string, observer:any, error:any) : void {
        observer.error("FAILED API Request on "+url+" -> "+JSON.stringify(error));
        observer.complete();
    }

    // gets used to get oauth tokens from given username and password
    private getAuthTokenByUsernameAndPassword (user:string, pass:string) : Observable<boolean> {

        // reset oAuth data
        this.oAuthData.cleanData();

        return Observable.create( observer => {

            this.basicApiHeaderConfig().subscribe( headers => {

                // prepare header data so that API accepts request
                headers.append('Content-Type', 'application/x-www-form-urlencoded');
                headers.append('Accept', '*/*');

                // in body send parameter
                var bodyData:string = "grant_type=password&client_id="+this.oAuthClientId+"&client_secret="+this.oAuthClientSecret+"&username="+encodeURIComponent(user)+"&password="+encodeURIComponent(pass);

                // the request url
                var apiEndpoint:string = this.apiBaseUrl+"../oauth2/token";

                this.http.post(
                    apiEndpoint,
                    bodyData,
                    {headers: headers}).subscribe(
                    // WIN
                    (res: Response) => {

                        // set oAuth data
                        this.oAuthData.mapFromJsonResponse(res);

                        // remember working access to api
                        this.apiEndpointWorkedOnce = true;

                        observer.next(true);
                        observer.complete();

                    },
                    // FAIL
                        error => {

                        if ((error.status) && (error.status==401)) {
                            // if just an unauthorized - return false
                            observer.next(false);
                            observer.complete();
                        } else {
                            // if any other status - throw error
                            observer.error("HTTP ERROR on "+apiEndpoint+" --> "+JSON.stringify(error));
                            observer.complete();
                        }
                    }
                );

            });

        });

    }

    // gets run when oAuth tokens need refresh
    private refreshAuthTokens () : Observable<boolean> {

        return Observable.create( observer => {

            // prepare header data so that API accepts request
            var headers = new Headers();
            headers.append('Content-Type', 'application/x-www-form-urlencoded');
            headers.append('Accept', '*/*');

            // in body send parameter
            var bodyData = "grant_type=refresh_token&client_id="+this.oAuthClientId+"&client_secret="+this.oAuthClientSecret+"&refresh_token="+encodeURIComponent(this.oAuthData.refreshToken);

            // the request url
            var apiEndpoint = this.apiBaseUrl+"../oauth2/token";

            this.http.post(
                apiEndpoint,
                bodyData,
                {headers: headers}).subscribe(
                // WIN
                (res: Response) => {

                    // set oAuth data
                    this.oAuthData.mapFromJsonResponse(res);

                    // call listener, when set by user
                    if (this.oAuthTokensRefreshStream!=null) this.oAuthTokensRefreshStream.next(this.oAuthData);

                    observer.next(true);
                    observer.complete();

                },
                // FAIL
                    error => {

                    if ((error.status) && (error.status==401)) {
                        // if just an unauthorized - return false
                        observer(false);
                        observer.complete();
                    } else {
                        // if any other status - throw error
                        observer.error("HTTP ERROR on "+apiEndpoint+" --> "+JSON.stringify(error));
                        observer.complete();
                    }
                }
            );


        });

    }

    // makes sure basic config is set on headers including auth
    // also takes care of auto tuning the correct API endpoint on first time use
    private basicApiHeaderConfig () : Observable<Headers> {

        return Observable.create( observer => {

            // make sure endpoint is working
            this.findWorkingApiBaseUrl().subscribe( isWorking => {
                if (!isWorking) {
                    observer.error("API endpoint base URL '"+this.apiBaseUrl+"' is not reachable.");
                    observer.complete();
                    return;
                }

                // make sure oAuth tokens are fresh
                this.makeSureOAuthTokenIsFresh().subscribe( allOk => {

                    // set headers and return as result
                    var headers = new Headers();
                    headers.append('Accept', 'application/json');
                    if (this.oAuthData.activated) headers.append('Authorization', 'Bearer ' + this.oAuthData.accessToken);
                    observer.next(headers);
                    observer.complete();

                });

            });

        });

    }

    // checks if the actual oauth access token is still valid and tries to refresh if needed
    private makeSureOAuthTokenIsFresh() : Observable<boolean> {

        return Observable.create( observer => {

            // add oAuth token if active
            if (this.oAuthData.activated) {

                // check if oAuth access token is still valid
                var tokensValidUntil = this.oAuthData.lastRefresh + (this.oAuthData.expiresIn * 60 * 1000) - 10000;
                if (tokensValidUntil < (new Date().getTime())) {

                    // access token needs refresh
                    this.refreshAuthTokens().subscribe( isOk => {
                        observer.next(isOk);
                        observer.complete();
                    } );

                } else {

                    // OK tokens are fresh
                    observer.next(true);
                    observer.complete();

                }
            } else {

                // no need to do anything - oAuth is off
                observer.next(true);
                observer.complete();

            }

        });

    }

    // auto tuning to a working API endpoint url from list
    private findWorkingApiBaseUrl() : Observable<boolean> {

        return Observable.create( observer => {

          // quick return if working endpoint was already found
          if (this.apiEndpointReachedOnce) {
            observer.next(true);
            observer.complete();
            return;
          };

          var headers = new Headers();
          headers.append('Content-Type', 'application/x-www-form-urlencoded');
          headers.append('Accept', '*/*');

          this.http.get(this.apiBaseUrl+'iam/v1/people/-home-/-me-',{
              headers: headers
          }).subscribe(
              // WIN
              (res: Response) => {

                  // OK found API - return win on promise
                  console.info("OK found API under '"+this.apiBaseUrl+"' with (200)");
                  
                  this.apiEndpointReachedOnce = true;
                  this.apiEndpointWorkedOnce = true;
                  observer.next(true);
                  observer.complete();

              },
              // FAIL
              error => {

                  if ((error.status) && (error.status==404)) {

                      console.warn("No API reachable under '"+this.apiBaseUrl+"'");

                      if ((this.possibleApiEndpointsIndex+1) < this.possibleApiEndpoints.length) {

                          // try the next API base URL in list of available

                          this.possibleApiEndpointsIndex++;
                          this.apiBaseUrl =this.possibleApiEndpoints[this.possibleApiEndpointsIndex];
                          console.warn("Switching to '"+this.apiBaseUrl+"' and trying again ...");
                          // recursive - float result on subscribe up
                          this.findWorkingApiBaseUrl().subscribe( result => {
                              observer.next(result);
                              observer.complete();
                          });

                      } else {

                          // tried all possible endpoints in list -> return final fail
                          observer.next(false);
                          observer.complete();
                      }

                  } else {

                      // even if error - if not a 404 we hit something - work with that
                      console.info("OK found API under '"+this.apiBaseUrl+"' with ("+error.status+")");
                      this.apiEndpointReachedOnce = true;

                      observer.next(true);
                      observer.complete();
                  }
              }
          );
      });
    }

}
