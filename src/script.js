// https://jsfiddle.skia.org/canvaskit/6a5c211a8cb4a7752297674b3533f7e1bbc2a78dd37f117c29a77bcc68411f31

import './style.css'

import {Typr} from './typr/Typr'

var CanvasKit = null

const ckLoaded = CanvasKitInit({
  locateFile: (file) => 'https://unpkg.com/canvaskit-wasm@0.37.0/bin/'+file});
ckLoaded.then((ck) => {
  CanvasKit = ck
  run();
  // const surface = CanvasKit.MakeCanvasSurface('foo');

  // const paint = new CanvasKit.Paint();
  // paint.setColor(CanvasKit.Color4f(0.9, 0, 0, 1.0));
  // paint.setStyle(CanvasKit.PaintStyle.Stroke);
  // paint.setAntiAlias(true);
  // const rr = CanvasKit.RRectXY(CanvasKit.LTRBRect(10, 60, 210, 260), 25, 15);

  // function draw(canvas) {
  //   canvas.clear(CanvasKit.WHITE);
  //   canvas.drawRRect(rr, paint);
  // }
  // surface.drawOnce(draw);
});

//const robotoURL = "https://storage.googleapis.com/skia-cdn/google-web-fonts/Roboto-Black.ttf"
const textFontURL = "/fonts/kass.ttf"
const emojiURL = "https://storage.googleapis.com/skia-cdn/misc/NotoColorEmoji.ttf"

export const FONT_CACHE = {}

class Font {
  constructor(location, buffer) {
    this.location = location
    this.buffer = buffer
  }
  
  static async Cacheable(location) {
    if (!(location in FONT_CACHE)) {
      const res = await fetch(location)
      if (!res.ok) {
        throw new Error(`${res.status}: ${await res.text()}`)
      }
      FONT_CACHE[location] = new Font(location, await res.arrayBuffer())
    }
    return FONT_CACHE[location]
  }

  static async Cacheables(locations) {
    return await Promise.all(locations.map(Font.Cacheable))
  }

  static ManagerFromCache() {
    return CanvasKit.FontMgr.FromData(Object.values(FONT_CACHE).map(f=>f.buffer))
  }
}

var PARAGRAPH = null;

async function run() {
  let fonts = await Font.Cacheables([textFontURL, emojiURL])

  const tyf = Typr.parse(fonts[0].buffer)[0]
  const tyf2 = Typr.parse(fonts[1].buffer)[0]
  console.log(tyf, tyf2)

  const fontMgr = Font.ManagerFromCache()

  const paraStyle = new CanvasKit.ParagraphStyle({
    textStyle: {
      color: CanvasKit.BLACK,
      fontFamilies: [tyf.name.fontFamily, 'Noto Color Emoji'],
      fontSize: 40,
    },
    strutStyle: {
      leading: 20,
      strutEnabled: true,
    },
    textAlign: CanvasKit.TextAlign.Left,
    maxLines: 7,
    ellipsis: '...',
  });

  const canv = document.getElementById("foo")
  const svgs = document.getElementById("svgs")
  canv.height = canv.clientHeight
  canv.width = canv.clientWidth

  const surface = CanvasKit.MakeCanvasSurface(canv.id)
  if (!surface) {
    throw 'Could not make surface';
  }

  //let str = "Hello world 🍔. This is some text that should be long enough to require some kind of line-breaking, wouldn’t that be nice. 🗺"

  let str = "Hello world. This is some text that should be long enough to require some kind of line-breaking, wouldn’t that be nice."

  const pairs = (vector) => vector.reduce((acc, v, i) => i%2==1 ? [...acc.slice(0, -1), [...acc.slice(-1), v]] : [...acc, v], [])

  function makeSVG(tag, attrs) {
    var el= document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (var k in attrs)
        el.setAttribute(k, attrs[k]);
    return el;
}

  function draw(canvas) {
    const builder = CanvasKit.ParagraphBuilder.Make(paraStyle, fontMgr)
    builder.addText(str)
    let paragraph = builder.build()

    canvas.clear(CanvasKit.TRANSPARENT)

    let wrapTo = canv.clientWidth
    paragraph.layout(wrapTo)

    canvas.drawParagraph(paragraph, 0, 0)

    const liner = new CanvasKit.Paint()
    liner.setStyle(CanvasKit.PaintStyle.Stroke)
    liner.setAntiAlias(true)
    liner.setColor([1, 0, 1, 0.3])

    paragraph.getShapedLines().map(line => {
      liner.setColor([1, 0, 1, 0.3])
      canvas.drawLine(0, line.baseline, wrapTo, line.baseline, liner)
      //console.log(line)
      
      line.runs.map(run => {
        let positions = pairs(run.positions)
        run.glyphs.map((g, i) => {
          let [x, y] = positions[i]

          liner.setColor([0, 0.5, 1, 0.7])
          //canvas.drawLine(x, line.top, x, line.baseline, liner)
          //console.log(tff.getGlyphBounds(g))

          liner.setColor([1, 0.5, 0, 0.7])
          //canvas.drawGlyphs([g], [x, y], 0, 0, tff, liner)

          let path = Typr.U.glyphToPath(tyf, g)

          //console.log(tyf["glyf"][g])

          const cp = str.codePointAt(run.offsets[i])
          if (cp) {
            const glyph = String.fromCodePoint(cp)
            const tyfGlyph = Typr.U.codeToGlyph(tyf, cp)
            if (tyfGlyph) {
            } else {
              console.log(cp, glyph)
              path = Typr.U.glyphToPath(tyf2, g)
            }
          }

          if (i >= 0) {
            let pathdata = Typr.U.pathToSVG(path)
            let pathel = makeSVG("path")
            pathel.setAttribute("d", pathdata)
            pathel.style.transform = `translate(${x}px, ${y}px) scale(0.04,-0.04)`
            svgs.appendChild(pathel)
          }
        })

        let [x, y] = positions.slice(-1)[0]
        liner.setColor([0, 0.5, 0.5, 1])
        //canvas.drawLine(x, line.top, x, line.baseline, liner)
      })
    })
  }

  surface.drawOnce(draw);
}