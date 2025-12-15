figma.showUI(__html__, { width: 450, height: 750 });

// Поиск узла с заливкой-изображением в выделении (включая вложенных детей)
function hasImageFill(node) {
  if (!('fills' in node)) return false;
  const fills = node.fills;
  return Array.isArray(fills) && fills.some(p => p && p.type === 'IMAGE');
}

function findImageNode(node) {
  if (hasImageFill(node)) return node;
  if ('children' in node && Array.isArray(node.children)) {
    for (const ch of node.children) {
      const f = findImageNode(ch);
      if (f) return f;
    }
  }
  return null;
}

function getFirstImageNodeFromSelection() {
  const sel = figma.currentPage.selection || [];
  for (const n of sel) {
    const found = findImageNode(n);
    if (found) return found;
  }
  return null;
}

// Показ превью текущего выбора (без перезаливки изображения)
async function sendSelectionPreview(ignoreEffects = false) {
  const imageNode = getFirstImageNodeFromSelection();
  if (!imageNode) {
    figma.ui.postMessage({ type: 'no-preview' });
    return;
  }
  try {
    // Временно отключаем эффекты если нужно
    let originalEffects = null;
    if (ignoreEffects && imageNode.effects && imageNode.effects.length > 0) {
      originalEffects = [...imageNode.effects];
      imageNode.effects = [];
    }
    
    const bytes = await imageNode.exportAsync({ format: 'PNG' });
    
    // Восстанавливаем эффекты
    if (originalEffects) {
      imageNode.effects = originalEffects;
    }
    
    // Собираем информацию о трансформации изображения в заливке для точного маппинга
    const paintInfo = getPaintInfo(imageNode);
    // Отправляем бинарные данные + paintInfo в UI
    figma.ui.postMessage({ type: 'set-preview', bytes, width: imageNode.width, height: imageNode.height, paintInfo });
  } catch (e) {
    figma.ui.postMessage({ type: 'no-preview' });
  }
}

figma.on('selectionchange', () => {
  sendSelectionPreview(true); // По умолчанию игнорируем эффекты
});

// Первичная отправка превью с игнорированием эффектов по умолчанию
sendSelectionPreview(true);

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'refresh-preview') {
    sendSelectionPreview(msg.ignoreEffects || false);
    return;
  }
  if (msg.type === 'request-resize') {
    try {
      const preset = msg.preset;
      const w = Math.max(300, Math.min(1600, Number(msg.width) || (preset === 'max' ? 1400 : 477)));
      const h = Math.max(300, Math.min(1200, Number(msg.height) || (preset === 'max' ? 1000 : 735)));
      figma.ui.resize(w, h);
    } catch (e) {
      // ignore
    }
    return;
  }
  if (msg.type === 'request-bytes') {
    const imageNode = getFirstImageNodeFromSelection();
    if (!imageNode) {
      figma.ui.postMessage({ type: 'no-preview' });
      return;
    }
    try {
      // Отправляем оригинальные байты из IMAGE-fill, чтобы сохранить масштаб/кроп при замене
      if (!('fills' in imageNode)) throw new Error('no fills');
      const fills = imageNode.fills;
      const imgPaint = Array.isArray(fills) ? fills.find(p => p && p.type === 'IMAGE') : null;
      if (!imgPaint) throw new Error('no image paint');
      const img = figma.getImageByHash(imgPaint.imageHash);
      const bytes = await img.getBytesAsync();
      const paintInfo = getPaintInfo(imageNode);
      figma.ui.postMessage({ type: 'provide-bytes', source: 'fill', bytes, paintInfo });
    } catch (e) {
      figma.ui.postMessage({ type: 'no-preview' });
    }
    return;
  }
  if (msg.type === 'replace-image-b64') {
    const { b64, mode } = msg;

    // Check license before processing
    const licenseInfo = await getLicenseInfo();
    if (!licenseInfo.isPro && licenseInfo.remainingUses <= 0) {
      figma.notify('Достигнут лимит использований. Приобретите Pro версию для неограниченного доступа.');
      figma.ui.postMessage({ type: 'usage-limit-reached' });
      return;
    }

    const imageNode = getFirstImageNodeFromSelection();
    if (!imageNode) {
      figma.notify('Выделите слой с изображением или фрейм/группу, содержащие изображение');
      return;
    }
    let target = imageNode;
    if (mode === 'copy') {
      const copy = imageNode.clone();
      imageNode.parent.appendChild(copy);
      copy.x += 20; copy.y += 20;
      target = copy;
    }
    if (!('fills' in target)) {
      figma.notify('Целевой слой не поддерживает заливки');
      return;
    }
    const fills = Array.isArray(target.fills) ? clonePaints(target.fills) : [];
    const idx = fills.findIndex(p => p && p.type === 'IMAGE');
    if (idx === -1) {
      figma.notify('Не найден IMAGE-fill у целевого слоя');
      return;
    }
    try {
      const bytes = base64ToBytes(b64);
      const image = figma.createImage(bytes);
      fills[idx].imageHash = image.hash;
      target.fills = fills;
      figma.currentPage.selection = [target];

      // Increment usage count after successful processing
      if (!licenseInfo.isPro) {
        const newCount = await incrementUsage();
        const remaining = Math.max(0, 5 - newCount);
        figma.ui.postMessage({
          type: 'usage-updated',
          usageCount: newCount,
          remainingUses: remaining
        });

        if (remaining === 0) {
          figma.notify('Это было ваше последнее бесплатное использование. Приобретите Pro версию!');
        } else if (remaining <= 2) {
          figma.notify(`Осталось ${remaining} бесплатных использований`);
        }
      }

      figma.notify('Изображение обновлено');
      sendSelectionPreview();
    } catch (e) {
      figma.notify('Ошибка обновления изображения');
    }
    return;
  }
  if (msg.type === 'replace-image') {
    const { bytes, mode } = msg;

    // Check license before processing
    const licenseInfo = await getLicenseInfo();
    if (!licenseInfo.isPro && licenseInfo.remainingUses <= 0) {
      figma.notify('Достигнут лимит использований. Приобретите Pro версию для неограниченного доступа.');
      figma.ui.postMessage({ type: 'usage-limit-reached' });
      return;
    }

    const imageNode = getFirstImageNodeFromSelection();
    if (!imageNode) {
      figma.notify('Выделите слой с изображением или фрейм/группу, содержащие изображение');
      return;
    }

    // Клонирование при необходимости
    let target = imageNode;
    if (mode === 'copy') {
      const copy = imageNode.clone();
      imageNode.parent.appendChild(copy);
      copy.x += 20; copy.y += 20;
      target = copy;
    }

    if (!('fills' in target)) {
      figma.notify('Целевой слой не поддерживает заливки');
      return;
    }
    const fills = Array.isArray(target.fills) ? clonePaints(target.fills) : [];
    const idx = fills.findIndex(p => p && p.type === 'IMAGE');
    if (idx === -1) {
      figma.notify('Не найден IMAGE-fill у целевого слоя');
      return;
    }

    try {
      const image = figma.createImage(new Uint8Array(bytes));
      fills[idx].imageHash = image.hash;
      target.fills = fills;

      // Increment usage count after successful processing
      if (!licenseInfo.isPro) {
        const newCount = await incrementUsage();
        const remaining = Math.max(0, 5 - newCount);
        figma.ui.postMessage({
          type: 'usage-updated',
          usageCount: newCount,
          remainingUses: remaining
        });

        if (remaining === 0) {
          figma.notify('Это было ваше последнее бесплатное использование. Приобретите Pro версию!');
        } else if (remaining <= 2) {
          figma.notify(`Осталось ${remaining} бесплатных использований`);
        }
      }

      figma.notify('Изображение обновлено');
      sendSelectionPreview();
    } catch (e) {
      figma.notify('Ошибка обновления изображения');
    }
  }

  if (msg.type === 'get-license-info') {
    const licenseInfo = await getLicenseInfo();
    figma.ui.postMessage(Object.assign({ type: 'license-info-response' }, licenseInfo));
    return;
  }

  if (msg.type === 'generate-challenge') {
    try {
      console.log('🔄 Starting challenge generation...');
      const challenge = await generateChallenge('color-target', 'purchase');
      const botUrl = `https://t.me/Figma_Plugin_Bot?start=${challenge}`;

      console.log('✅ Challenge generated successfully:');
      console.log('  Challenge ID:', challenge);
      console.log('  Bot URL:', botUrl);
      console.log('  URL Length:', botUrl.length);

      figma.ui.postMessage({ type: 'challenge-response', challenge, botUrl });
    } catch (error) {
      console.error('❌ Error generating challenge:', error);
      figma.ui.postMessage({
        type: 'challenge-error',
        message: 'Failed to generate challenge. Please try again.'
      });
    }
    return;
  }

  if (msg.type === 'generate-recovery-challenge') {
    try {
      const challenge = await generateChallenge('color-target', 'recovery');
      const botUrl = `https://t.me/Figma_Plugin_Bot?start=recovery_${challenge}`;
      figma.ui.postMessage({ type: 'challenge-response', challenge, botUrl });
    } catch (error) {
      console.error('Error generating recovery challenge:', error);
      figma.ui.postMessage({
        type: 'challenge-error',
        message: 'Failed to generate recovery challenge. Please try again.'
      });
    }
    return;
  }

  if (msg.type === 'activate-with-key') {
    const success = await activateProWithKey(msg.key, msg.testOtherDevice);
    return;
  }

  if (msg.type === 'get-language') {
    try {
      const language = await figma.clientStorage.getAsync('color-target-language');
      figma.ui.postMessage({ type: 'get-language-response', language: language || 'en' });
    } catch (e) {
      console.error('Error getting language:', e);
      figma.ui.postMessage({ type: 'get-language-response', language: 'en' });
    }
    return;
  }

  if (msg.type === 'store-language') {
    try {
      await figma.clientStorage.setAsync('color-target-language', msg.language);
      console.log('Language stored:', msg.language);
    } catch (e) {
      console.error('Error storing language:', e);
    }
    return;
  }
};

// Server time validation
async function getServerTime() {
  try {
    // Try multiple time sources for reliability
    const timeAPIs = [
      'https://worldtimeapi.org/api/timezone/UTC',
      'https://timeapi.io/api/Time/current/zone?timeZone=UTC',
      'http://worldclockapi.com/api/json/utc/now'
    ];

    for (const api of timeAPIs) {
      try {
        const response = await fetch(api, {
          method: 'GET',
          timeout: 5000 // 5 second timeout
        });

        if (!response.ok) continue;

        const data = await response.json();

        // Parse different API formats
        let serverTime;
        if (data.datetime) {
          // WorldTimeAPI format
          serverTime = new Date(data.datetime);
        } else if (data.dateTime) {
          // TimeAPI format
          serverTime = new Date(data.dateTime);
        } else if (data.currentDateTime) {
          // WorldClockAPI format
          serverTime = new Date(data.currentDateTime);
        }

        if (serverTime && !isNaN(serverTime.getTime())) {
          console.log('✅ Server time obtained:', serverTime.toISOString());
          return serverTime;
        }
      } catch (apiError) {
        console.warn('⚠️ Time API failed:', api, apiError.message);
        continue;
      }
    }

    // If all APIs fail, fall back to local time with warning
    console.warn('⚠️ All time APIs failed, using local time (security risk)');
    return new Date();

  } catch (error) {
    console.error('❌ Server time error:', error);
    return new Date(); // Fallback to local time
  }
}

// Validate subscription with server time
async function validateSubscriptionTime(expirationDate) {
  try {
    const serverTime = await getServerTime();
    const expiryDate = new Date(expirationDate);

    console.log('🕐 Server time:', serverTime.toISOString());
    console.log('⏰ Expiry time:', expiryDate.toISOString());

    const isExpired = serverTime >= expiryDate;
    const daysRemaining = Math.ceil((expiryDate - serverTime) / (1000 * 60 * 60 * 24));

    return {
      isExpired,
      daysRemaining: Math.max(0, daysRemaining),
      serverTime: serverTime.toISOString(),
      checkedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Time validation error:', error);
    // Fallback to local time validation
    const localTime = new Date();
    const expiryDate = new Date(expirationDate);
    const isExpired = localTime >= expiryDate;
    const daysRemaining = Math.ceil((expiryDate - localTime) / (1000 * 60 * 60 * 24));

    return {
      isExpired,
      daysRemaining: Math.max(0, daysRemaining),
      serverTime: null,
      checkedAt: localTime.toISOString(),
      fallbackUsed: true
    };
  }
}

// Usage counter functions
async function incrementUsage() {
  try {
    const currentCount = await figma.clientStorage.getAsync('color-target-usage-count') || 0;
    const newCount = parseInt(currentCount) + 1;
    await figma.clientStorage.setAsync('color-target-usage-count', newCount);
    console.log('📊 Usage count incremented to:', newCount);
    return newCount;
  } catch (e) {
    console.error('❌ Error incrementing usage:', e);
    return 0;
  }
}

// License management functions
async function getLicenseInfo() {
  try {
    const isPro = await figma.clientStorage.getAsync('color-target-pro') || false;
    const expiryTime = await figma.clientStorage.getAsync('color-target-pro-expiry') || 0;
    const usageCount = await figma.clientStorage.getAsync('color-target-usage-count') || 0;
    const keyInfoStr = await figma.clientStorage.getAsync('color-target-key-info');

    let keyInfo = null;
    if (keyInfoStr) {
      try {
        keyInfo = JSON.parse(keyInfoStr);
      } catch (e) {
        // ignore
      }
    }

    let isExpired = false;
    let serverValidation = null;

    if (isPro && expiryTime > 0) {
      // Use server time validation for security
      serverValidation = await validateSubscriptionTime(new Date(expiryTime).toISOString());
      isExpired = serverValidation.isExpired;

      if (isExpired) {
        console.log('🚫 Subscription expired according to server time');
        await figma.clientStorage.setAsync('color-target-pro', false);

        // Store server validation info for debugging
        await figma.clientStorage.setAsync('last-server-validation', JSON.stringify(serverValidation));
      } else {
        console.log('✅ Subscription valid according to server time');
      }
    }

    const remainingUses = Math.max(0, 5 - usageCount);

    const licenseInfo = {
      isPro: isPro && !isExpired,
      usageCount: usageCount,
      remainingUses: isPro && !isExpired ? -1 : remainingUses,
      expiryTime: expiryTime,
      keyInfo: keyInfo
    };

    if (isPro && !isExpired && expiryTime > 0 && serverValidation) {
      const daysUntilExpiry = serverValidation.daysRemaining;
      if (daysUntilExpiry <= 7) {
        licenseInfo.expiryWarning = true;
        licenseInfo.daysUntilExpiry = daysUntilExpiry;
      }

      // Add server validation info to license info
      licenseInfo.serverValidation = {
        serverTime: serverValidation.serverTime,
        checkedAt: serverValidation.checkedAt,
        fallbackUsed: serverValidation.fallbackUsed || false
      };
    }

    return licenseInfo;
  } catch (e) {
    return {
      isPro: false,
      usageCount: 0,
      remainingUses: 5,
      expiryTime: 0,
      keyInfo: null
    };
  }
}

// Device fingerprint generation
async function getDeviceFingerprint() {
  try {
    // Try to get existing fingerprint
    let fingerprint = await figma.clientStorage.getAsync('device-fingerprint');

    // Force regeneration if fingerprint is too long (old format)
    if (!fingerprint || fingerprint.length > 15) {
      // Generate shorter fingerprint to avoid URL length issues
      const timestamp = Date.now().toString();
      const random = Math.random().toString(36).substring(2, 10); // Shorter random

      // Create a shorter unique fingerprint
      fingerprint = `${timestamp.slice(-6)}${random.substring(0, 6)}`; // Last 6 digits of timestamp + 6 random chars

      // Store it persistently
      await figma.clientStorage.setAsync('device-fingerprint', fingerprint);
      console.log('🆔 Generated new short device fingerprint:', fingerprint);
    } else {
      console.log('🆔 Using existing device fingerprint:', fingerprint);
    }

    return fingerprint;
  } catch (error) {
    console.error('Error getting device fingerprint:', error);
    // Fallback fingerprint
    return Date.now().toString().slice(-6) + Math.random().toString(36).substring(2, 8);
  }
}

async function generateChallenge(pluginId, challengeType = 'purchase') {
  try {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 10); // Shorter random part

    // Get device fingerprint for personal key binding
    const deviceFingerprint = await getDeviceFingerprint();

    const challengeData = {
      pluginId,
      challengeType,
      timestamp,
      expires: parseInt(timestamp) + (30 * 60 * 1000),
      version: '1.0',
      deviceFingerprint: deviceFingerprint // Include fingerprint in challenge
    };

    // Include fingerprint in challenge ID format: pluginId_timestamp-random_fingerprint
    const challengeId = `${pluginId}_${timestamp}-${random}_${deviceFingerprint}`;
    await figma.clientStorage.setAsync(`challenge-${challengeId}`, JSON.stringify(challengeData));

    console.log('🔑 Generated challenge with fingerprint:', {
      challengeId,
      deviceFingerprint
    });

    return challengeId;
  } catch (error) {
    console.error('Error generating challenge:', error);
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 15);
    return `${pluginId}_${timestamp}-${random}`;
  }
}

async function activateProWithKey(key, testOtherDevice = false) {
  try {
    console.log('🔑 Activating key:', key);

    // Validate key format
    if (!key || !key.startsWith('CT-')) {
      figma.ui.postMessage({
        type: 'key-activation-response',
        success: false,
        error: 'format',
        message: 'Invalid key format'
      });
      return false;
    }

    // Try to decode the key
    try {
      const keyContent = key.substring(3);
      const bytes = base64ToBytes(keyContent);
      const decoded = String.fromCharCode.apply(null, bytes);
      const keyData = JSON.parse(decoded);

      console.log('✅ Key decoded successfully:', keyData);

      // Basic validation
      if (!keyData.subscriptionType || !keyData.pluginId) {
        throw new Error('Missing required fields');
      }

      if (keyData.pluginId !== 'color-target') {
        throw new Error('Key is for different plugin');
      }

      // Check if this is a personal key that requires device binding
      if (keyData.personalKey && keyData.targetUserId) {
        const deviceFingerprint = await getDeviceFingerprint();
        console.log('🔍 Checking personal key binding:', {
          keyTargetUser: keyData.targetUserId,
          deviceFingerprint: deviceFingerprint,
          match: keyData.targetUserId === deviceFingerprint
        });

        if (keyData.targetUserId !== deviceFingerprint) {
          console.log('🚫 Personal key not valid for this device');
          figma.ui.postMessage({
            type: 'key-activation-response',
            success: false,
            error: 'device_mismatch',
            message: 'This key is bound to a different device'
          });
          return false;
        }
        console.log('✅ Personal key validated for this device');
      }

      // Check expiration for non-lifetime keys using server time
      if (keyData.subscriptionType !== 'lifetime' && keyData.subscriptionType !== 'reset') {
        if (keyData.expirationDate) {
          const validation = await validateSubscriptionTime(keyData.expirationDate);
          if (validation.isExpired) {
            console.log('🚫 Key expired according to server time');
            figma.ui.postMessage({
              type: 'key-activation-response',
              success: false,
              error: 'expired',
              message: validation.fallbackUsed ?
                'Key has expired (local time check)' :
                'Key has expired (server verified)'
            });
            return false;
          }
          console.log('✅ Key valid according to server time, days remaining:', validation.daysRemaining);
        }
      }

      // Handle reset keys
      if (keyData.subscriptionType === 'reset') {
        await figma.clientStorage.setAsync('color-target-pro', false);
        await figma.clientStorage.setAsync('color-target-pro-expiry', 0);
        await figma.clientStorage.setAsync('color-target-usage-count', 0);

        figma.ui.postMessage({
          type: 'key-activation-response',
          success: true,
          action: 'reset',
          message: 'Subscription reset successfully'
        });
        return true;
      }

      // Activate subscription
      const expiryTime = keyData.expirationDate ? new Date(keyData.expirationDate).getTime() : 0;

      await figma.clientStorage.setAsync('color-target-pro', true);
      await figma.clientStorage.setAsync('color-target-pro-expiry', expiryTime);

      // Calculate days remaining using server time
      let daysRemaining = Infinity;
      if (keyData.expirationDate && keyData.subscriptionType !== 'lifetime') {
        const validation = await validateSubscriptionTime(keyData.expirationDate);
        daysRemaining = validation.daysRemaining;
        console.log('📅 Days remaining (server time):', daysRemaining);
      }

      const keyInfo = {
        subscriptionType: keyData.subscriptionType,
        purchaseDate: keyData.purchaseDate,
        expirationDate: keyData.expirationDate,
        isAdminGenerated: keyData.adminGenerated || false,
        daysRemaining: daysRemaining
      };

      await figma.clientStorage.setAsync('color-target-key-info', JSON.stringify(keyInfo));

      console.log('✅ Subscription activated:', keyInfo);

      figma.ui.postMessage({
        type: 'key-activation-response',
        success: true,
        action: 'activate',
        keyInfo: keyInfo,
        message: `${keyData.subscriptionType} subscription activated successfully`
      });

      return true;

    } catch (decodeError) {
      console.error('❌ Key decode error:', decodeError);
      figma.ui.postMessage({
        type: 'key-activation-response',
        success: false,
        error: 'validation',
        message: 'Invalid or corrupted key'
      });
      return false;
    }

  } catch (e) {
    console.error('❌ Activation error:', e);
    figma.ui.postMessage({
      type: 'key-activation-response',
      success: false,
      error: 'network',
      message: 'Error occurred during activation'
    });
    return false;
  }
}


// ---------------------- Вспомогательные функции ----------------------

function hexToRgb01(hex) {
  const v = parseInt(hex.slice(1), 16);
  const r = ((v >> 16) & 255) / 255;
  const g = ((v >> 8) & 255) / 255;
  const b = (v & 255) / 255;
  return { r, g, b };
}

function base64ToBytes(b64) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let bufferLength = b64.length * 0.75;
  if (b64[b64.length - 1] === '=') bufferLength--;
  if (b64[b64.length - 2] === '=') bufferLength--;
  const bytes = new Uint8Array(bufferLength);
  let p = 0;
  for (let i = 0; i < b64.length; i += 4) {
    const encoded1 = alphabet.indexOf(b64[i]);
    const encoded2 = alphabet.indexOf(b64[i + 1]);
    const encoded3 = alphabet.indexOf(b64[i + 2]);
    const encoded4 = alphabet.indexOf(b64[i + 3]);
    const chr1 = (encoded1 << 2) | (encoded2 >> 4);
    const chr2 = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    const chr3 = ((encoded3 & 3) << 6) | encoded4;
    bytes[p++] = chr1;
    if (encoded3 !== 64) bytes[p++] = chr2;
    if (encoded4 !== 64) bytes[p++] = chr3;
  }
  return bytes;
}

function clonePaints(paints) {
  try {
    return JSON.parse(JSON.stringify(paints));
  } catch (e) {
    // fallback: shallow copy без использования spread-оператора
    return paints.map(p => {
      const o = {};
      for (var k in p) if (Object.prototype.hasOwnProperty.call(p, k)) o[k] = p[k];
      return o;
    });
  }
}

// Извлекает параметры трансформации/масштабирования IMAGE-заливки
function getPaintInfo(node) {
  var info = null;
  try {
    if (!node || !('fills' in node)) return null;
    var fills = node.fills;
    if (!Array.isArray(fills)) return null;
    var imgPaint = null;
    for (var i = 0; i < fills.length; i++) {
      var p = fills[i];
      if (p && p.type === 'IMAGE') { imgPaint = p; break; }
    }
    if (!imgPaint) return null;
    var mode = (imgPaint.scaleMode ? String(imgPaint.scaleMode) : 'FILL');
    var tf = imgPaint.imageTransform || null; // [[a,b,tx],[c,d,ty]]
    info = {
      scaleMode: mode,
      imageTransform: tf,
      nodeW: node.width,
      nodeH: node.height
    };
  } catch (e) {
    // ignore
  }
  return info;
}
