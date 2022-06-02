import { Observable , Subscription } from 'rxjs';
import {  tap , map, mergeMap} from 'rxjs/operators';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { EntityType,CloudAppRestService, CloudAppEventsService, CloudAppSettingsService,   PageInfo,
  Entity,  AlertService, FormGroupUtil } from '@exlibris/exl-cloudapp-angular-lib';/* added  FormGroupUtil  */
/*************************new impots for form  */
  //import { Component, OnInit } from '@angular/core';
  import { AppService } from '../app.service';
  import { FormGroup } from '@angular/forms';
  //import { AlertService, CloudAppSettingsService, FormGroupUtil } from '@exlibris/exl-cloudapp-angular-lib';
  //import { Settings } from 'settings';
  /***********************END new impots for form  */


@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})

export class MainComponent implements OnInit, OnDestroy {

  private pageLoad$: Subscription;
  entities: Array<Entity> = [];
  loading = false;
  selectedEntity: Entity;
  apiResult: any;
  primoBaseUrl: string = "Please configure";
  apiGetUrl: string;

  entities$: Observable<Entity[]> = this.eventsService.entities$
  .pipe(tap(() => this.clear()))

  constructor(
    private restService: CloudAppRestService,
    private eventsService: CloudAppEventsService,
    private settingsService: CloudAppSettingsService
  ) { }

  ngOnInit() {
    this.pageLoad$ = this.eventsService.onPageLoad(this.onPageLoad);

    this.settingsService.get().subscribe( settings => {
      console.log ("Load: " + settings.primoBaseUrl);
      this.primoBaseUrl = settings.primoBaseUrl;
    }); 
  }

  onPageLoad = (pageInfo: PageInfo) => {
    let pageContent = (pageInfo.entities || []);
    this.entities = pageContent.length > 0 ? pageContent : this.entities;
    if (pageContent.length > 0) {
      var elementsIds = pageContent.map(function(elem){ return elem.id;}).join(",");

      if (pageContent[0].type=='BIB_MMS') {
        this.apiGetUrl = "/bibs?view=brief&mms_id=" + elementsIds;
        this.displayEntBibs();
      }
      if (pageContent[0].type=='IER') {
        this.apiGetUrl = "/esploro/v1/assets/" + elementsIds;
        this.displayEntAssets();
      }
    }
  };

  displayEntBibs(){
      console.log("displayEntBib: ",this.entities);
      console.log("Calling Alma: " + this.apiGetUrl);
      this.entities$ = this.eventsService.entities$.pipe(
        tap(()=>this.loading = true),
        mergeMap(entities => this.restService.call(this.apiGetUrl)),
        tap((entities) => console.log("Bibs:",entities)),
        map(
          (bibs:any) => bibs.bib.map(b => ({   
          id: b.mms_id,
          title: b.title,
          author: b.author,
          dop: b.date_of_publication,
          type: EntityType.BIB_MMS,
          link: `${this.primoBaseUrl}${b.mms_id}`
        }))),
        tap(()=>this.loading = false)
      )
  }
  displayEntAssets(){
    console.log("displayEntAsset: ",this.entities);
    console.log("Calling Esploro: " + this.apiGetUrl);
    this.entities$ = this.eventsService.entities$.pipe(
      tap(()=>this.loading = true),
      mergeMap(entities => this.restService.call(this.apiGetUrl)),
      tap((entities) => console.log("IERs:",entities)),  
      map(
        (records:any) => records.records.map(r => ({
        id: r.originalRepository.assetId,
        title: r.title,
        author: r.creators[0].creatorname,
        dop: r.displayedDateByPriorityEsploroCP, 
        type: EntityType.IER,
        link: `${this.primoBaseUrl}/esploro/outputs/journalArticle/${r.originalRepository.assetId}`
      }))),
      tap(()=>this.loading = false)
    )
}

  savePrimoUrl() {
    var toSave = { "primoBaseUrl": this.primoBaseUrl };
    this.settingsService.set(toSave).subscribe( response => console.log('Saved') )
    this.displayEntAssets();
      
  }

  ngOnDestroy(): void {
  }

  clear() {
    this.apiResult = null;
    this.selectedEntity = null;
  }
}