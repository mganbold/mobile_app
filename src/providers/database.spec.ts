import { DatabaseProvider } from "./database";
import { fireBaseConfig } from "../configs";

import { Subscription } from "rxjs/Subscription";
import { Observable } from "rxjs/Observable";
import "rxjs/add/observable/throw";

describe("app/providers/database", () => {
  const authProviderMock: any = {};
  const httpClientMock: any = {};
  const dbProvider = new DatabaseProvider(authProviderMock, httpClientMock);

  describe("getOrgPathForUser()", () => {
    let subscription: Subscription | null;

    afterEach(() => {
      if (subscription) {
        subscription.unsubscribe();
        subscription = null;
      }
    });

    it("returns org path", (done) => {
      const userRef: any = {
        child: function(uid) {
          return this;
        },
        once: function(value) {
          return Promise.resolve({ val: () => {
            return { orgs: { path: "100" } };
          }});
        }
      };
      const ref = spyOn(dbProvider as any, "dbRef").and.returnValue(userRef);

      subscription = dbProvider.getOrgPathForUser("id").subscribe(data => {
        expect(data).toEqual("100");

        done();
      });
      expect(ref).toHaveBeenCalled();
    });

    it("returns org path from array", (done) => {
      const userRef: any = {
        child: function(uid) {
          return this;
        },
        once: function(value) {
          return Promise.resolve({ val: () => {
            return { orgs: [{ path: "bar" }] };
          }});
        }
      };
      const ref = spyOn(dbProvider as any, "dbRef").and.returnValue(userRef);

      subscription = dbProvider.getOrgPathForUser("id").subscribe(data => {
        expect(data).toEqual("bar");

        done();
      });
      expect(ref).toHaveBeenCalled();
    });

    it("catches error", (done) => {
      const userRef: any = {
        child: function(uid) {
          return this;
        },
        once: function(value) {
          return Promise.reject(new Error("err"));
        }
      };
      const ref = spyOn(dbProvider as any, "dbRef").and.returnValue(userRef);

      subscription = dbProvider.getOrgPathForUser("id").subscribe(data => {
        // placeholder to appease compiler
        const test = 100;
      },
        error => {
          expect(error).toEqual(new Error("err"));
          done();
      });
    });
  });

  describe("getMetersForOrg()", () => {
    let subscription: Subscription | null;

    afterEach(() => {
      if (subscription) {
        subscription.unsubscribe();
        subscription = null;
      }
    });

    it("returns an array of meters", (done) => {
      const spyGetMeters = spyOn(dbProvider as any, "_getMeters").and.returnValue("foo");
      const orgRef: any = {
        child: function(uid) {
          return this;
        },
        once: function(value) {
          return Promise.resolve([
            {
              val: () => {
                return { _meters: { _gas: 100, _power: 200, _solar: 300, _water: 400 } };
              }
            }
          ]);
        }
      };
      const ref = spyOn(dbProvider as any, "dbRef").and.returnValue(orgRef);

      subscription = dbProvider.getOrgPathForUser("id").subscribe(data => {
        expect(data).toEqual("bar");

        done();
      });
    });
  });
});
