import { messageCommand, MessageCommandContext, MessageCommandFlagKeys } from "../lib/handler/messageCommand.js";
//import { ws } from "../events/express/ws.js";

export default class test extends messageCommand {
    public name: string = "test";
    public description: string = "A test command to verify the bot's functionality.";
    public aliases?: string[] = [];
    public usage: string = "{prefix}{command} [args...]";
    public examples?: string[] = ["test"];
    public cooldown: number | string = "1s"
    public flags: MessageCommandFlagKeys[] = ["devOnly","onlyGuild"]
    public allowedRoles?: string[] = [];



    public async execute(options: MessageCommandContext): Promise<void> {
        const { message, client } = options;
        const order = {
            "event": "order.created",
            "body": {
              "event": "order.created",
              "merchant": 1874450306,
              "created_at": "Sun Aug 24 2025 01:58:16 GMT+0300",
              "data": {
                "id": 2068899826,
                "checkout_id": null,
                "reference_id": 201333079,
                "urls": {
                  "customer": "https://demostore.salla.sa/dev-8olrv5c6kbyl2fiw/order/G5KgBOyd97kj1Aq2jgoL1bD2AN4JnmZR",
                  "admin": "https://s.salla.sa/orders/order/G5KgBOyd97kj1Aq2jgoL1bD2AN4JnmZR",
                  "rating": null,
                  "digital_content": "https://demostore.salla.sa/dev-8olrv5c6kbyl2fiw/orders/digital/JXD5LO463JYAgqZoaMzbXrWGp26ql300pjBK91N7d2w8eVkmElRy0xnZ"
                },
                "date": {
                  "date": "2025-08-24 01:58:15.000000",
                  "timezone_type": 3,
                  "timezone": "Asia/Riyadh"
                },
                "updated_at": {
                  "date": "2025-08-24 01:58:15.000000",
                  "timezone_type": 3,
                  "timezone": "Asia/Riyadh"
                },
                "source": "dashboard",
                "draft": false,
                "read": true,
                "source_details": {
                  "type": "dashboard",
                  "value": null,
                  "device": "desktop",
                  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
                  "utm_source": "",
                  "utm_campaign": "",
                  "utm_medium": "",
                  "utm_term": "",
                  "utm_content": "",
                  "ip": null
                },
                "status": {
                  "id": 566146469,
                  "name": "بإنتظار المراجعة",
                  "slug": "under_review",
                  "customized": {
                    "id": 977619117,
                    "name": "بإنتظار المراجعة"
                  }
                },
                "is_price_quote": false,
                "payment_method": "bank",
                "receipt_image": "https://cdn.salla.sa/gZwrWp/orders/rxSTLvms2EQDoq9GtrtgmSEw8WQjji7zBqtCgKRp.png",
                "currency": "SAR",
                "amounts": {
                  "sub_total": {
                    "amount": 174,
                    "currency": "SAR"
                  },
                  "shipping_cost": {
                    "amount": 0,
                    "currency": "SAR"
                  },
                  "cash_on_delivery": {
                    "amount": 0,
                    "currency": "SAR"
                  },
                  "tax": {
                    "percent": "15.00",
                    "amount": {
                      "amount": 26.1,
                      "currency": "SAR"
                    }
                  },
                  "discounts": [],
                  "total": {
                    "amount": 200.1,
                    "currency": "SAR"
                  }
                },
                "exchange_rate": {
                  "base_currency": "SAR",
                  "exchange_currency": "SAR",
                  "rate": "1.00000000"
                },
                "can_cancel": false,
                "campaign": {
                  "medium": "",
                  "source": "",
                  "campaign": ""
                },
                "show_weight": false,
                "can_reorder": false,
                "shipping_status": "shipping_ready",
                "is_pending_payment": false,
                "pending_payment_ends_at": 172798,
                "total_weight": "٠٫١ كجم",
                "features": {
                  "shippable": false,
                  "digitalable": false,
                  "pickable": false,
                  "multiple_shipments_supported": false,
                  "order_type_price_quote": false,
                  "has_suspicious_alert": false
                },
                "shipping": null,
                "shipments": null,
                "shipment_branch": [],
                "payment_actions": {
                  "refund_action": {
                    "has_refund_amount": false,
                    "payment_method_label": "حوالة بنكية",
                    "can_print_refund_invoice": false,
                    "paid_amount": {
                      "amount": 200.1,
                      "currency": "SAR"
                    },
                    "refund_amount": {
                      "amount": 0,
                      "currency": "SAR"
                    },
                    "loyalty_point_programs": [],
                    "can_send_sms": false,
                    "can_send_sms_msg": "يرجى تفعيل احد مزودين خدمة SMS من صفحة ربط الخدمات"
                  },
                  "remaining_action": {
                    "has_remaining_amount": false,
                    "payment_method_label": "حوالة بنكية",
                    "paid_amount": {
                      "amount": 200.1,
                      "currency": "SAR"
                    },
                    "checkout_url": "",
                    "remaining_amount": {
                      "amount": 0,
                      "currency": "SAR"
                    }
                  }
                },
                "notes": null,
                "customer": {
                  "id": 850592124,
                  "full_name": "علي الصعري",
                  "first_name": "علي",
                  "last_name": "الصعري",
                  "mobile": 553490968,
                  "mobile_code": "+966",
                  "email": "ali.711hd@gmail.com",
                  "urls": {
                    "customer": "https://demostore.salla.sa/dev-8olrv5c6kbyl2fiw/profile",
                    "admin": "https://s.salla.sa/customers/vojJNXqrZ3pYzMzRQQPMwlE8eGQLBRmK"
                  },
                  "avatar": "https://cdn.assets.salla.network/prod/admin/cp/assets/images/avatar_male.png",
                  "gender": "",
                  "birthday": null,
                  "city": "",
                  "country": "السعودية",
                  "country_code": "",
                  "currency": "",
                  "location": "",
                  "lang": "ar",
                  "created_at": {
                    "date": "2025-08-15 14:24:57.000000",
                    "timezone_type": 3,
                    "timezone": "Asia/Riyadh"
                  },
                  "updated_at": {
                    "date": "2025-08-22 10:09:03.000000",
                    "timezone_type": 3,
                    "timezone": "Asia/Riyadh"
                  },
                  "groups": []
                },
                "items": [
                  {
                    "id": 31590212,
                    "name": "حزمة الضريبة و ( التعديلات )",
                    "sku": "",
                    "product_sku_id": 662258771,
                    "quantity": 1,
                    "currency": "SAR",
                    "weight": 0.1,
                    "weight_label": "٠ كجم",
                    "weight_type": "kg",
                    "product_type": "product",
                    "product_thumbnail": "https://cdn.salla.sa/gZwrWp/35d273f3-b505-4189-96fa-33d44e904e22-333.33333333333x500-6yANSwgdEkcvseDpctGWQF9PMjeBgGP6nLHkWGmA.png",
                    "mpn": null,
                    "gtin": null,
                    "amounts": {
                      "price_without_tax": {
                        "amount": 174,
                        "currency": "SAR"
                      },
                      "total_discount": {
                        "amount": 0,
                        "currency": "SAR"
                      },
                      "tax": {
                        "percent": "15.00",
                        "amount": {
                          "amount": 26.1,
                          "currency": "SAR"
                        }
                      },
                      "total": {
                        "amount": 200.1,
                        "currency": "SAR"
                      }
                    },
                    "notes": "",
                    "product": {
                      "id": 280055998,
                      "type": "product",
                      "promotion": {
                        "title": null,
                        "sub_title": null
                      },
                      "quantity": null,
                      "status": "sale",
                      "is_available": true,
                      "sku": "",
                      "name": "حزمة الضريبة و ( التعديلات )",
                      "price": {
                        "amount": 174,
                        "currency": "SAR"
                      },
                      "sale_price": {
                        "amount": 174,
                        "currency": "SAR"
                      },
                      "currency": "SAR",
                      "url": "https://demostore.salla.sa/dev-8olrv5c6kbyl2fiw/حزمة-الضريبة-و-التعديلات/p280055998",
                      "thumbnail": "https://cdn.salla.sa/gZwrWp/35d273f3-b505-4189-96fa-33d44e904e22-333.33333333333x500-6yANSwgdEkcvseDpctGWQF9PMjeBgGP6nLHkWGmA.png",
                      "has_special_price": true,
                      "regular_price": {
                        "amount": 349,
                        "currency": "SAR"
                      },
                      "calories": null,
                      "mpn": "",
                      "gtin": "",
                      "description": "<h1 class=\"ql-align-right ql-direction-rtl text-right\">🎮&nbsp;<strong>امتلك سيرفرك الخاص وصمّمه على ما تحب! 🔥</strong></h1><pre class=\"ql-syntax\" spellcheck=\"false\">🚀 احصل على سيرفر متكامل لكل المنصات\n مُعد خصيصًا لك! 🔐\n</pre><h1 class=\"ql-align-right ql-direction-rtl text-right\"><strong>--------------------------------------------</strong></h1><h4 class=\"ql-align-right ql-direction-rtl text-right\">إذا كنت تدور عن&nbsp;<strong>سيرفر خاص&nbsp;</strong><u>(أي بمعنى يكون الدخول برمز, وتسمح للي تبي بالدخول..)</u>، حنا هنا بنقدم لك&nbsp;<strong>الحل الأنسب</strong>! ✅</h4><p class=\"ql-align-right ql-direction-rtl text-right\">بمجرد شرائك&nbsp;<strong>ملف الإعدادات</strong>، بنعطيك رمز الدخول على سيرفر مجهّز بالكامل، مع&nbsp;<strong>إعدادات قابلة للتعديل</strong>&nbsp;لتجربة لعب مثالية تناسبك! 🎯</p><h2 class=\"ql-align-right ql-direction-rtl text-right\"><strong>--------------------------------------------</strong></h2><h2 class=\"ql-align-right ql-direction-rtl text-right\">✨&nbsp;<strong>ليه اختار هذي الباقة؟</strong></h2><p class=\"ql-align-right ql-direction-rtl text-right\">✅&nbsp;<strong>تحكم كامل</strong>&nbsp;في إعدادات السيرفر، من عدد اللاعبين وحتى المودات والموارد! 🛠️</p><p class=\"ql-align-right ql-direction-rtl text-right\">✅&nbsp;<strong>بنينا هذي الاعدادات مع مجتمع لوقان على مدار 4 سنين من التطوير والتحسين المستمر لتصلك أفضل تجربة</strong>🎯💥</p><p class=\"ql-align-right ql-direction-rtl text-right\">✅&nbsp;<strong>تحصل على اشتراك خادم نترادو لمدة شهر مجانًا</strong>&nbsp;– بدلاً من أن تدفع&nbsp;<strong>16.19$ دولار</strong>، ضمن هذه الباقة! 🆓🔥</p><p class=\"ql-align-right ql-direction-rtl text-right\">✅ إمكانية تعديل إعدادات السيرفر بالطريقة التي تناسبك مع الحزم المتوفرة!</p><p class=\"ql-align-right ql-direction-rtl text-right\">✅&nbsp;<strong>دعم ومتابعة مستمرة لضمان أفضل أداء!</strong>&nbsp;🛠️</p><p class=\"ql-align-right ql-direction-rtl text-right\">✅&nbsp;<strong>اختيار عدد اللاعبين وأي ماب</strong>&nbsp;لتلعب بالاسلوب اللي تحبه! 🌍</p><p><br></p>",
                      "favorite": null,
                      "features": {
                        "availability_notify": null,
                        "show_rating": true
                      }
                    },
                    "options": [
                      {
                        "id": 1613751134,
                        "product_option_id": 1147755781,
                        "name": "إضافات للمنتج",
                        "type": "radio",
                        "value": {
                          "id": 1001838574,
                          "name": "حزمة ضريبة تمارا",
                          "price": {
                            "amount": 0,
                            "currency": "SAR"
                          },
                          "option_value": ""
                        }
                      }
                    ],
                    "images": [],
                    "branches_quantity": []
                  }
                ],
                "bank": {
                  "id": 1411319638,
                  "bank_name": "البنك الأهلي التجاري",
                  "bank_id": 1473353380,
                  "account_name": "Demo Account",
                  "account_number": "000000608010167519",
                  "iban_number": "SA2380000382608010130308",
                  "iban_certificate": null,
                  "sbc_certificate": null,
                  "certificate_type": "iban",
                  "account_type": null,
                  "status": "active"
                },
                "tags": [],
                "store": {
                  "id": 1874450306,
                  "store_id": 1874450306,
                  "user_id": 1149177890,
                  "user_email": "moodiksa170@gmail.com",
                  "username": "dev-8olrv5c6kbyl2fiw",
                  "name": {
                    "ar": "متجر تجريبي",
                    "en": null
                  },
                  "avatar": "https://salla-dev.s3.eu-central-1.amazonaws.com/logo/logo-fashion.jpg"
                }
              }
            }
          }

        //await ws.emit("message", JSON.stringify(order))










    }




}