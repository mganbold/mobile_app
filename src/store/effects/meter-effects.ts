import { Injectable } from "@angular/core";
import { Effect, Actions } from "@ngrx/effects";
import { Storage } from "@ionic/storage";
import * as moment from "moment";
import { ToastController } from "ionic-angular";

import { Observable } from "rxjs/rx";
import "rxjs/add/operator/map";
import "rxjs/add/operator/switchMap";
import "rxjs/add/observable/combineLatest";
import "rxjs/add/observable/fromPromise";

import { DatabaseProvider } from "../../providers";
import { IMeter, IUser } from "../../interfaces";
import { environment } from "../../environments";

import { CostHelper } from "../../helpers";
import {
  LOAD_METERS,
  LOAD_METER,
  TRIGGER_ADD_METER,
  TRIGGER_REMOVE_METER,
  TRIGGER_LOAD_METERS,
  TRIGGER_UPDATE_METER_SETTINGS,
  TRIGGER_VALIDATE_METER,

  AddMeter,
  RemoveMeter,
  AddMeters,
  AddMeterGuid,
  LoadMeters,
  LoadMeter,
  TriggerUpdateMeterReads,
  UpdateUser,
  UpdateMeter
} from "../actions";

@Injectable()
export class MeterEffects {
  /**
   * Handles meter Toasts.
   * @memberof MeterEffects
   */
  private _presentToast(meterName: string, event: string) {
    let message = `Adding ${meterName}...`;

    if (event === "completed") {
      message = `${meterName} was successfully added.`;
    }

    if (event === "removed") {
      message = `${meterName} was successfully removed.`;
    }

    const toast = this._toastCtrl.create({
      message: message,
      duration: 2000,
      cssClass: "meter-toast",
      position: "top"
    });

    // removes any existing toasts
    toast.dismissAll();
    toast.present();
  }

  /**
   * Handles load meters action.
   *
   * Updates the store with data from cache if found.
   * Otherwise, dispatch load from db action to fetch from the API.
   *
   * @memberof MainEffects
   */
  @Effect()
  public checkCacheAndThenLoadData$ = this._actions$
    .ofType(TRIGGER_LOAD_METERS)
    .map((action: any) => action.payload)
    .switchMap((user: IUser) => {
      return Observable.combineLatest([
        Observable.fromPromise(
          // Check if meter data is stored locally by uid as key.
          this._storage.get(user.uid).then(cachedData => {
            return cachedData || {};
          })
        ),
        Observable.of(user)
      ]);
    })
    .map((values: any[]) => {
      const [ cachedData, user = null ] = values;
      const { meters = [], lastUpdatedDate = null } = cachedData;

      // Check if retention policy is expired.
      let cachePolicyExpired = false;
      if (lastUpdatedDate) {
        const { cacheDuration } = environment;

        cachePolicyExpired = moment(lastUpdatedDate).add(cacheDuration, "m").toDate() < new Date();
      }

      // Load data from database.
      if (!meters.length || !lastUpdatedDate || cachePolicyExpired) {
        return new LoadMeters(user);
      }

      // Load data from cache.
      return new AddMeters(meters);
    });

  /**
   * Handles load from database action.
   *
   * Fetches meter data from Firebase using uid.
   *
   * @memberof MainEffects
   */
  @Effect()
  public loadMetersFromDatabase$ = this._actions$
    .ofType(LOAD_METERS)
    .map((action: any) => action.payload)
    .switchMap((user: IUser) => {
      return Observable.combineLatest([
        this._db.getOrgPathForUser(user.uid),
        Observable.of(user)
      ]);
    })
    .switchMap((values: any[]) => {
      const [ orgPath, user ] = values;
      const updatedUser = Object.assign({}, user, { orgPath });

      return Observable.combineLatest([
        this._db.getMetersForOrg(orgPath),
        Observable.of(updatedUser)
      ]);
    })
    .flatMap((values: any[]) => {
      const [ meters = [], user ] = values;

      // const newMeters = [meters[0]];

      // Load one meter at a time.
      // return meters.map(meter => {
      //   return new LoadMeter({ meter, user });
      // });
      return [
        new LoadMeter({ meters, user })
      ];
    });

  @Effect()
  public loadMeterData$ = this._actions$
    .ofType(LOAD_METER)
    .map((action: any) => action.payload)
    .switchMap(data => {
      const { meters = [], user } = data;
      const lastMeter = meters.length ? meters[meters.length - 1] : null;
      const remainingMeters = meters.filter(meter => meter._guid !== lastMeter._guid);

      return Observable.combineLatest([
        lastMeter ? this._db.getReadsForMeters([lastMeter]) : Observable.of(null),
        Observable.of(user),
        Observable.of(remainingMeters)
      ]);
    })
    .switchMap((values: any[]) => {
      const [ meter, user, meters ] = values;

      return Observable.combineLatest([
        meter ? this._db.getProviderForMeters([meter]) : Observable.of(null),
        Observable.of(user),
        Observable.of(meters)
      ]);
    })
    .flatMap((values: any[]) => {
      const [ meter = null, user, meters = [] ] = values;

      if (meter === null || !meters.length) {
        return [new AddMeter(null)];
      }

      // Calculates actual cost and usage.
      const newMeters = meters.length ? CostHelper.calculateCostAndUsageForMeters(meters) : [];

      // Store meter data locally by uid as key.
      // this._storage.set(user.uid, {
      //   meters: newMeters,
      //   lastUpdatedDate: new Date()
      // });

      // Dispatch actions to update the store.
      return [
        // Add meters to store.
        // new AddMeters(newMeters),
        new AddMeter(newMeters[0]),

        // Dispatch the same action.
        new LoadMeter({ meters, user }),

        // Update user in store
        new UpdateUser(user)
      ];
    });

  /**
   * Handles TRIGGER_UPDATE_METER_SETTINGS action and
   * updates meter settings in the store.
   */
  @Effect()
  public updateMeterSettings$ = this._actions$
    .ofType(TRIGGER_UPDATE_METER_SETTINGS)
    .map((action: any) => action.payload)
    .switchMap((data: any) => {
      const { meter = null, user = null } = data;

      return Observable.combineLatest([
        this._db.updateMeterSettings(meter, user),
        Observable.of(user)
      ]);
    })
    .map((data: any[]) => {
      const [ meter = [], user ] = data;

      // Refreshes reads for this meter.
      return new TriggerUpdateMeterReads({ meter, user });
    });

  /**
   * Handles ADD_METER action and
   * adds meter to the store.
   */
  @Effect()
  public addMeter$ = this._actions$
    .ofType(TRIGGER_ADD_METER)
    .map((action: any) => action.payload)
    .switchMap((data: any) => {
      const { meter = null, user = null } = data;
      this._presentToast(meter._name, "adding");
      return  this._db.addMeter(meter, user);
    })
    .switchMap((meter: IMeter) => {
      return this._db.getProviderForMeters([meter]);
    })
    .switchMap((meter: IMeter[]) => {
      // Gets reads from database for given meter.
      return this._db.getReadsForMeters(meter);
    })
    .map((meter: IMeter[]) => {
      const newMeter = CostHelper.calculateCostAndUsageForMeters([meter[0]]);
      this._presentToast(meter[0]._name, "completed");

      return new AddMeter(newMeter[0]);
    });

  /**
   * Handles VALIDATE_METER actions and
   * adds meterGuid to the state.provider.
   */
  @Effect()
  public validateMeter$ = this._actions$
    .ofType(TRIGGER_VALIDATE_METER)
    .map((action: any) => action.payload)
    .switchMap((meterId: string) => {
      return this._db.findMeterById(meterId);
    })
    .map((meterGuid: string) => {
      return new AddMeterGuid(meterGuid);
    });

  /**
   * Removes meter from database and store.
   */
  @Effect()
  public removeMeter$ = this._actions$
    .ofType(TRIGGER_REMOVE_METER)
    .map((action: any) => action.payload)
    .switchMap((data: any) => {
      const { meter, user } = data;

      // Removes meter from database.
      return this._db.deleteMeter(meter, user);
    })
    .map((meter: IMeter) => {
      this._presentToast(meter._name, "removed");
      // Removes meter from store.
      return new RemoveMeter(meter);
    });

  constructor(
    private readonly _actions$: Actions,
    private readonly _db: DatabaseProvider,
    private readonly _storage: Storage,
    private _toastCtrl: ToastController
  ) { }
}
