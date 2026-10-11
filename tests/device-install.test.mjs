import test from 'node:test';
import assert from 'node:assert/strict';
import {detectCarrierDevice} from '../src/lib/platform/device-install.ts';
import {verifiedReleaseLinks} from '../src/lib/platform/carrier-releases.ts';

test('mobile detection takes priority over desktop compatibility strings',()=>{
  assert.equal(detectCarrierDevice('Mozilla Android Linux'),'android');
  assert.equal(detectCarrierDevice('Mozilla Macintosh',5),'ios');
  assert.equal(detectCarrierDevice('Mozilla Macintosh',0),'mac');
  assert.equal(detectCarrierDevice('Windows NT 10.0'),'windows');
  assert.equal(detectCarrierDevice('X11 Linux x86_64'),'linux');
  assert.equal(detectCarrierDevice('unknown'),'unknown');
});
test('only published expected Carrier release assets generate fixed download URLs',()=>{
  const data={tag_name:'carrier-desktop-production',assets:[{name:'Urban-Carrier-Windows-x64.exe',state:'uploaded',size:100,browser_download_url:'https://evil.example/download'}]};
  assert.equal(verifiedReleaseLinks(data).windows,'https://github.com/redavi19-asu/icomputer-dispatch-platform/releases/download/carrier-desktop-production/Urban-Carrier-Windows-x64.exe');
  for(const change of [{draft:true},{prerelease:true},{tag_name:'another'},{assets:[]},{assets:[{name:'Urban-Carrier-Windows-x64.exe',state:'uploaded',size:0}]}]) assert.deepEqual(verifiedReleaseLinks({...data,...change}),{});
  assert.deepEqual(verifiedReleaseLinks(null),{});
});
