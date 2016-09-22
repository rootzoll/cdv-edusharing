import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import {TranslateService, TranslatePipe} from 'ng2-translate/ng2-translate';

import { MD_BUTTON_DIRECTIVES } from '@angular2-material/button';

import { GwtInterfaceService } from '.././gwt-interface.service';

import {EduApiService} from '.././edu-api.service';
import * as EduData from '.././edu-api.data';

@Component({
  selector: 'content-detail',
  templateUrl: 'app/content-detail/content-detail.component.html',
  styleUrls: ['app/content-detail/content-detail.component.css'],
  directives: [
    MD_BUTTON_DIRECTIVES
    ],
  pipes: [
    TranslatePipe
    ],
  providers: [
    GwtInterfaceService
    ],
})
export class ContentDetailComponent implements OnInit {

  @Input() ref:EduData.CollectionReference;
  @Input() collection:EduData.Collection;

  @Output() onBackClick = new EventEmitter();

  lastRefId:string = null;
  renderSnippetHtml:string = "";

  loading:boolean = false;
  loadError:boolean = false;

  constructor(
      private translationService:TranslateService,
      public eduApiService:EduApiService,
      public gwtInterface:GwtInterfaceService
  ) {}

  public back() : void {
        this.onBackClick.emit({});
  }

  public remove() : void {
    this.loading = true;
    this.eduApiService.removeFromCollection(this.ref.ref.id, this.collection.ref.id).subscribe(
      result => {
        this.loading = false;
        this.onBackClick.emit({});
      }, error => {
        this.loading = false;
        alert("ERROR. Was not able to remove from collection.");
      }
    );
  }

  public more() : void {
    // TODO
    alert("TODO: More Menu");
  }

  private onChangedContent():void {

    // scroll to top
    window.scrollTo(0,0);

    // remove old dynamic libs
    var oldLibs = document.getElementsByClassName("renderscript");
    if (oldLibs.length>0) {
      //alert("REMOVE "+oldLibs.length+" OLD LIBS")
      for (var j=0; j<oldLibs.length; j++) {
        oldLibs[j].parentNode.removeChild(oldLibs[j]);
      }
    }

    // get HTML snippet for content
    this.loading = true;
    this.eduApiService.getRenderSnippetForContent(this.ref).subscribe((snippet) => {

      // SUCCESS
      this.loading = false;
      this.loadError = false;

      // put the HTML snippet into the container div
      var renderDiv:any = document.getElementById('renderDiv');
      renderDiv.innerHTML = snippet;

      // execute all javascripts within snippets
      var that = this;
      
      var exucuteNextScript = function(arrayOfScriptElements, index) {

        if (index==arrayOfScriptElements.length) return;
        console.log("*** Scripts index("+index+") length("+arrayOfScriptElements.length+")");
        var nextScriptElement = arrayOfScriptElements[index];
        if ((nextScriptElement.outerHTML!=null) && (nextScriptElement.outerHTML.indexOf('src=')>0)) {

          // loading script
          var src = nextScriptElement.outerHTML.substr(nextScriptElement.outerHTML.indexOf('src=')+5);
          if ((src!=null) && (src.length>3)) {
            if (src.indexOf('"')>0) src=src.substr(0,src.indexOf('"'));
            if (src.indexOf("'")>0) src=src.substr(0,src.indexOf("'"));
            that.eduApiService.httpGET(src).subscribe( (js) => {

              // WIN  
              try {
                var s = document.createElement('script');
                s.type = 'text/javascript';  
                s.className = "renderscript";          
                try {
                  s.appendChild(document.createTextNode(js));
                  document.body.appendChild(s);
                } catch (e) {
                  s.text = js;
                  document.body.appendChild(s);
                }
                console.log("OK EXTERNAL SCRIPT "+src);
              } catch (e) {
                console.warn("FAIL EXTERNAL SCRIPT ("+JSON.stringify(e)+"): "+src);
              }
              exucuteNextScript(arrayOfScriptElements, index+1);

            }, error => {
              // FAILED
              console.warn("FAILED to load script from snippet (2) "+JSON.stringify(error));
              exucuteNextScript(arrayOfScriptElements, index+1);
            });
          } else {
            console.warn("FAILED to load script from snippet (1)");
            exucuteNextScript(arrayOfScriptElements, index+1);
          }
        } else {
 
              try {
                var s = document.createElement('script');
                s.type = 'text/javascript';  
                s.className = "renderscript";          
                try {
                  s.appendChild(document.createTextNode(nextScriptElement.text));
                  document.body.appendChild(s);
                } catch (e) {
                  s.text = nextScriptElement.text;
                  document.body.appendChild(s);
                }
                console.log("OK EXTERNAL SCRIPT "+src);
              } catch (e) {
                console.warn("FAIL EXTERNAL SCRIPT ("+JSON.stringify(e)+"): "+src);
              }
              exucuteNextScript(arrayOfScriptElements, index+1);

            console.log("OK LOCAL SCRIPT");

          exucuteNextScript(arrayOfScriptElements, index+1);
        }
      };
      exucuteNextScript(renderDiv.getElementsByTagName("script"),0);
      
    }, error => {
      // FAIL
      this.loading = false;
      this.loadError = true;
    });

  }

  ngOnInit():void {}

  ngDoCheck() {
    var gotNewContent:boolean = (this.ref!=null) && (this.lastRefId!=this.ref.ref.id);
    if (this.ref!=null) this.lastRefId=this.ref.ref.id;
    if (gotNewContent) this.onChangedContent();  
  }

}
