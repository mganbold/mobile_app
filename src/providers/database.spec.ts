import { DatabaseProvider } from "./database";
import { fireBaseConfig } from "../configs";

import { Subscription } from "rxjs/Subscription";

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
      const spyRef = spyOn(dbProvider as any, "dbRef").and.returnValue(userRef);

      subscription = dbProvider.getOrgPathForUser("id").subscribe(data => {
        expect(data).toEqual("100");
        expect(spyRef).toHaveBeenCalled();

        done();
      });
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
      const spyRef = spyOn(dbProvider as any, "dbRef").and.returnValue(userRef);

      subscription = dbProvider.getOrgPathForUser("id").subscribe(data => {
        expect(data).toEqual("bar");
        expect(spyRef).toHaveBeenCalled();

        done();
      });
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
      const spyRef = spyOn(dbProvider as any, "dbRef").and.returnValue(userRef);

      subscription = dbProvider.getOrgPathForUser("id").subscribe(data => {
        // placeholder to appease compiler
        const test = 100;
      },
        error => {
          expect(error).toEqual(new Error("err"));
          expect(spyRef).toHaveBeenCalled();

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
      const spyGetMeters = spyOn(dbProvider as any, "_getMeters")
        .and.returnValues(100, 200, 300, 400);
      const orgRef: any = {
        child: function(uid) {
          return this;
        },
        once: function(value) {
          return Promise.resolve([{
              val: () => {
                return { _meters: { _gas: 100, _power: 200, _solar: 300, _water: 400 } };
              }
            }]);
        }
      };
      const spyRef = spyOn(dbProvider as any, "dbRef").and.returnValue(orgRef);

      subscription = dbProvider.getMetersForOrg("id").subscribe(data => {
        expect(data).toEqual([100, 200, 300, 400] as any);
        expect(spyGetMeters).toHaveBeenCalledTimes(4);
        expect(spyRef).toHaveBeenCalled();

        done();
      });
    });

    it("returns an empty array if _meters does not exist", (done) => {
      const orgRef: any = {
        child: function(uid) {
          return this;
        },
        once: function(value) {
          return Promise.resolve([{
              val: () => {
                return { _meters: null };
              }
            }]);
        }
      };
      const spyRef = spyOn(dbProvider as any, "dbRef").and.returnValue(orgRef);

      subscription = dbProvider.getMetersForOrg("id").subscribe(data => {
        expect(data).toEqual([] as any);
        expect(spyRef).toHaveBeenCalled();

        done();
      });
    });

    it("catches error", (done) => {
      const orgRef: any = {
        child: function(uid) {
          return this;
        },
        once: function(value) {
          return Promise.reject(new Error("err"));
        }
      };
      const spyRef = spyOn(dbProvider as any, "dbRef").and.returnValue(orgRef);

      subscription = dbProvider.getMetersForOrg("id").subscribe(data => {
        // placeholder to appease compiler
        const test = 100;
      }, error => {
        expect(error).toEqual(new Error("err"));
        expect(spyRef).toHaveBeenCalled();

        done();
      });
    });
  });

  describe("_getProviderForMeter()", () => {
    let subscription: Subscription | null;

    afterEach(() => {
      if (subscription) {
        subscription.unsubscribe();
        subscription = null;
      }
    });

    it("returns provider data", (done) => {
      const providerRef: any = {
        child: function(uid) {
          return this;
        },
        once: function(value) {
          return Promise.resolve({ val: () => 100 });
        }
      };
      const spyRef = spyOn(dbProvider as any, "dbRef").and.returnValue(providerRef);

      subscription = (dbProvider as any)._getProviderForMeter("path").subscribe(data => {
        expect(data).toEqual(100);
        expect(spyRef).toHaveBeenCalled();

        done();
      });
    });

    it("catches error", (done) => {
      const providerRef: any = {
        child: function(uid) {
          return this;
        },
        once: function(value) {
          return Promise.reject(new Error("err"));
        }
      };
      const spyRef = spyOn(dbProvider as any, "dbRef").and.returnValue(providerRef);

      subscription = dbProvider.getMetersForOrg("id").subscribe(data => {
        // placeholder to appease compiler
        const test = 100;
      }, error => {
        expect(error).toEqual(new Error("err"));
        expect(spyRef).toHaveBeenCalled();

        done();
      });
    });
  });

  describe("deleteMeter()", () => {
    let subscription: Subscription | null;

    afterEach(() => {
      if (subscription) {
        subscription.unsubscribe();
        subscription = null;
      }
    });

    it("calls child() function with correct path and then remove() function", (done) => {
      const user = { uid: 150 };
      const meter = { _utilityType: "test", _name: "bar" };
      const providerRef: any = {
        child: function(uid) {
          return this;
        },
        remove: function(value) {
          return Promise.resolve();
        }
      };
      const spyRef = spyOn(dbProvider as any, "dbRef").and.returnValue(providerRef);
      const spyRemove = spyOn(providerRef, "remove").and.callThrough();
      const spyChild = spyOn(providerRef, "child").and.callThrough();
      const path = `Vutiliti/VutilitiCP/Residential/${user.uid}/Building1/_meters/_${meter._utilityType}/${meter._name}`;

      subscription = dbProvider.deleteMeter(meter as any, user as any).subscribe(data => {
        expect(data).toEqual(meter as any);
        expect(spyRef).toHaveBeenCalled();
        expect(spyChild).toHaveBeenCalledWith(path);
        expect(spyRemove).toHaveBeenCalled();

        done();
      });
    });
  });

  describe("findMeterById()", () => {
    let subscription: Subscription | null;

    afterEach(() => {
      if (subscription) {
        subscription.unsubscribe();
        subscription = null;
      }
    });

    it("finds meter", (done) => {
      const meterRef: any = {
        orderByChild: function(meter_id) {
          return this;
        },
        equalTo: function() {
          return this;
        },
        once: function(value) {
          return Promise.resolve({
            val: () => {
              return { guid: "guid1" };
            }
          });
        }
      };
      const spyRef = spyOn(dbProvider as any, "dbRef").and.returnValue(meterRef);
      const spyOrderByChild = spyOn(meterRef, "orderByChild").and.callThrough();
      const spyEqualTo = spyOn(meterRef, "equalTo").and.callThrough();
      const spyOnce = spyOn(meterRef, "once").and.callThrough();

      subscription = dbProvider.findMeterById("id").subscribe(data => {
        expect(data).toEqual("guid");
        expect(spyRef).toHaveBeenCalled();
        expect(spyOrderByChild).toHaveBeenCalledWith("meter_id");
        expect(spyEqualTo).toHaveBeenCalledWith("id");
        expect(spyOnce).toHaveBeenCalledWith("value");

        done();
      });
    });

    it("catches error", (done) => {
      const meterRef: any = {
        orderByChild: function(meter_id) {
          return this;
        },
        equalTo: function() {
          return this;
        },
        once: function(value) {
          return Promise.reject(new Error("err"));
        }
      };
      const spyRef = spyOn(dbProvider as any, "dbRef").and.returnValue(meterRef);

      subscription = dbProvider.findMeterById("id").subscribe(data => {
        // placeholder to appease compiler
        const test = 100;
      }, error => {
        expect(error).toEqual(new Error("err"));
        expect(spyRef).toHaveBeenCalled();

        done();
      });
    });
  });

});
