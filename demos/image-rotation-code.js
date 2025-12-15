// Image Rotation Studio - Figma Plugin
figma.showUI(__html__, { width: 400, height: 800 });

// Helper function to apply 3D-like transformations in Figma
function apply3DTransform(node, rotation, mockupPerspective, baseTransform = null) {
  let totalRotationZ = 0;
  let totalRotationX = 0;
  let totalRotationY = 0;

  // Combine image rotation with mockup perspective
  if (rotation) {
    if (typeof rotation === 'number') {
      totalRotationZ = rotation;
    } else {
      totalRotationZ = rotation.z || 0;
      totalRotationX = rotation.x || 0;
      totalRotationY = rotation.y || 0;
    }
  }

  if (mockupPerspective) {
    totalRotationZ += mockupPerspective.z || 0;
    totalRotationX += mockupPerspective.x || 0;
    totalRotationY += mockupPerspective.y || 0;
  }

  console.log('🎯 Applying enhanced 3D transform:', {
    x: totalRotationX,
    y: totalRotationY,
    z: totalRotationZ
  });

  // Apply combined transformations
  if (totalRotationZ !== 0 || totalRotationX !== 0 || totalRotationY !== 0) {
    const centerX = node.x + node.width / 2;
    const centerY = node.y + node.height / 2;

    // Start with identity matrix
    let transform = [[1, 0, 0], [0, 1, 0]];

    // Apply Z rotation (normal rotation) first
    if (totalRotationZ !== 0) {
      const radZ = (totalRotationZ * Math.PI) / 180;
      const cosZ = Math.cos(radZ);
      const sinZ = Math.sin(radZ);

      transform = [
        [cosZ, -sinZ, 0],
        [sinZ, cosZ, 0]
      ];
    }

    // Apply Y rotation (perspective left/right) - more pronounced effect
    if (totalRotationY !== 0) {
      const radY = (totalRotationY * Math.PI) / 180;
      const cosY = Math.cos(radY);
      const sinY = Math.sin(radY);

      // Enhanced perspective effect
      const scaleX = Math.abs(cosY); // Always positive scaling
      const skewX = sinY * 0.8; // Increased skew for more dramatic effect

      // Apply Y rotation to current transform
      const currentTransform = transform;
      transform = [
        [currentTransform[0][0] * scaleX + currentTransform[0][1] * skewX,
        currentTransform[0][1],
        currentTransform[0][2]],
        [currentTransform[1][0] * scaleX + currentTransform[1][1] * skewX,
        currentTransform[1][1],
        currentTransform[1][2]]
      ];
    }

    // Apply X rotation (perspective up/down) - more pronounced effect
    if (totalRotationX !== 0) {
      const radX = (totalRotationX * Math.PI) / 180;
      const cosX = Math.cos(radX);
      const sinX = Math.sin(radX);

      // Enhanced perspective effect
      const scaleY = Math.abs(cosX); // Always positive scaling
      const skewY = sinX * 0.8; // Increased skew for more dramatic effect

      // Apply X rotation to current transform
      const currentTransform = transform;
      transform = [
        [currentTransform[0][0],
        currentTransform[0][1] * scaleY + currentTransform[0][0] * skewY,
        currentTransform[0][2]],
        [currentTransform[1][0],
        currentTransform[1][1] * scaleY + currentTransform[1][0] * skewY,
        currentTransform[1][2]]
      ];
    }

    // Apply translation to center the transformation
    transform[0][2] = centerX - centerX * transform[0][0] - centerY * transform[0][1];
    transform[1][2] = centerY - centerX * transform[1][0] - centerY * transform[1][1];

    // Apply base transform if provided
    if (baseTransform) {
      // Combine with base transform
      const base = baseTransform;
      const combined = [
        [
          base[0][0] * transform[0][0] + base[0][1] * transform[1][0],
          base[0][0] * transform[0][1] + base[0][1] * transform[1][1],
          base[0][0] * transform[0][2] + base[0][1] * transform[1][2] + base[0][2]
        ],
        [
          base[1][0] * transform[0][0] + base[1][1] * transform[1][0],
          base[1][0] * transform[0][1] + base[1][1] * transform[1][1],
          base[1][0] * transform[0][2] + base[1][1] * transform[1][2] + base[1][2]
        ]
      ];
      transform = combined;
    }

    console.log('🔧 Final transform matrix:', transform);
    node.relativeTransform = transform;
  }
}

// License management
async function incrementUsage() {
  try {
    const currentCount = await figma.clientStorage.getAsync('mocup-studio-usage-count') || 0;
    const newCount = parseInt(currentCount) + 1;
    await figma.clientStorage.setAsync('mocup-studio-usage-count', newCount);
    console.log('📊 Usage count incremented to:', newCount);
    return newCount;
  } catch (e) {
    console.error('❌ Error incrementing usage:', e);
    return 0;
  }
}

async function getLicenseInfo() {
  try {
    const isPro = await figma.clientStorage.getAsync('mocup-studio-pro') || false;
    const expiryTime = await figma.clientStorage.getAsync('mocup-studio-pro-expiry') || 0;
    const usageCount = await figma.clientStorage.getAsync('mocup-studio-usage-count') || 0;
    const keyInfoStr = await figma.clientStorage.getAsync('mocup-studio-key-info');

    let keyInfo = null;
    if (keyInfoStr) {
      try {
        keyInfo = JSON.parse(keyInfoStr);
      } catch (e) {
        console.error('Error parsing key info:', e);
      }
    }

    let isExpired = false;

    if (isPro && expiryTime > 0) {
      const now = Date.now();
      isExpired = now > expiryTime;

      if (isExpired) {
        console.log('🚫 Subscription expired');
        await figma.clientStorage.setAsync('mocup-studio-pro', false);
      } else {
        console.log('✅ Subscription valid');
      }
    }

    const remainingUses = Math.max(0, 10 - usageCount);

    const licenseInfo = {
      isPro: isPro && !isExpired,
      usageCount: usageCount,
      remainingUses: isPro && !isExpired ? -1 : remainingUses,
      expiryTime: expiryTime,
      keyInfo: keyInfo
    };

    if (isPro && !isExpired && expiryTime > 0) {
      const timeUntilExpiry = expiryTime - Date.now();
      const daysUntilExpiry = Math.ceil(timeUntilExpiry / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry <= 7) {
        licenseInfo.expiryWarning = true;
        licenseInfo.daysUntilExpiry = daysUntilExpiry;
      }
    }

    return licenseInfo;
  } catch (e) {
    console.error('Error getting license info:', e);
    return {
      isPro: false,
      usageCount: 0,
      remainingUses: 10,
      expiryTime: 0,
      keyInfo: null
    };
  }
}

// Auto-export on selection change
figma.on('selectionchange', () => {
  exportCurrentSelection();
});

async function exportCurrentSelection() {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    figma.ui.postMessage({
      type: 'no-selection',
      message: 'Select an image or object to rotate'
    });
    return;
  }

  const node = selection[0];

  console.log('🔍 Selected node:', {
    type: node.type,
    name: node.name,
    width: node.width,
    height: node.height
  });

  // Detect rotation from node's transform matrix
  let detectedRotation = { z: 0, x: 0, y: 0 };

  if (node.relativeTransform) {
    const transform = node.relativeTransform;
    // Extract Z rotation from 2D transform matrix
    // transform[0][0] = cos(θ), transform[0][1] = -sin(θ)
    const angle = Math.atan2(-transform[0][1], transform[0][0]);
    const degrees = (angle * 180) / Math.PI;

    // Round to nearest degree and normalize to -180 to 180 range
    detectedRotation.z = Math.round(((degrees % 360) + 360) % 360);
    if (detectedRotation.z > 180) detectedRotation.z -= 360;

    console.log('🎯 Detected rotation:', detectedRotation.z + '°');
  }

  // Support image-containing nodes and vectors
  const supportedTypes = ['RECTANGLE', 'FRAME', 'COMPONENT', 'INSTANCE', 'GROUP', 'VECTOR'];
  if (!supportedTypes.includes(node.type)) {
    console.log('❌ Unsupported node type:', node.type);
    figma.ui.postMessage({
      type: 'error',
      message: `Please select an image, frame, component, or vector. Selected: ${node.type}`
    });
    return;
  }

  try {
    console.log('📤 Starting export for:', node.name, node.type);

    // Show loading message for complex objects
    if (node.type === 'GROUP' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
      figma.ui.postMessage({
        type: 'export-progress',
        message: 'Exporting complex object, please wait...'
      });
    }

    // Export the selected node as PNG with optimized settings
    const bytes = await node.exportAsync({
      format: 'PNG',
      constraint: { type: 'SCALE', value: 1.5 }, // Reduced quality for faster export
      contentsOnly: true,
      useAbsoluteBounds: false // Optimize for complex groups
    });

    console.log('✅ Export successful, bytes length:', bytes.length);

    // Convert to base64
    const base64 = figma.base64Encode(bytes);

    figma.ui.postMessage({
      type: 'image-exported',
      data: `data:image/png;base64,${base64}`,
      width: node.width,
      height: node.height,
      name: node.name,
      detectedRotation: detectedRotation
    });
  } catch (error) {
    console.error('Export error:', error);
    figma.ui.postMessage({
      type: 'error',
      message: 'Failed to export. Try selecting a different object.'
    });
  }
}

// Handle messages from UI
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'resize-window') {
    figma.ui.resize(msg.width, msg.height);
    return;
  }

  if (msg.type === 'get-mockup-image') {
    try {
      // Find the mockup node by ID
      const mockupNode = await figma.getNodeByIdAsync(msg.mockupData.id);
      if (mockupNode) {
        // Export mockup as image
        const imageData = await mockupNode.exportAsync({
          format: 'PNG',
          constraint: { type: 'SCALE', value: 0.5 } // 50% scale for preview
        });

        // Convert to base64
        const base64 = figma.base64Encode(imageData);
        const dataUrl = `data:image/png;base64,${base64}`;

        figma.ui.postMessage({
          type: 'mockup-image-response',
          imageData: dataUrl
        });
      }
    } catch (error) {
      console.error('Error getting mockup image:', error);
      figma.ui.postMessage({
        type: 'mockup-image-error',
        error: error.message
      });
    }
    return;
  }

  if (msg.type === 'auto-export') {
    exportCurrentSelection();
  }

  if (msg.type === 'get-license-info') {
    const licenseInfo = await getLicenseInfo();
    figma.ui.postMessage({
      type: 'license-info-response',
      isPro: licenseInfo.isPro,
      usageCount: licenseInfo.usageCount,
      remainingUses: licenseInfo.remainingUses,
      expiryTime: licenseInfo.expiryTime,
      expiryWarning: licenseInfo.expiryWarning,
      daysUntilExpiry: licenseInfo.daysUntilExpiry,
      keyInfo: licenseInfo.keyInfo
    });
  }

  if (msg.type === 'update-usage') {
    // This is sent from UI when usage is incremented
    // We could store it here if needed
  }

  if (msg.type === 'apply-rotation') {
    console.log('🎯 Figma received apply-rotation:', {
      rotation: msg.rotation,
      canvasSize: { width: msg.canvasWidth, height: msg.canvasHeight },
      keepOriginalSize: msg.keepOriginalSize,
      hasRotation: msg.hasRotation
    });

    const licenseInfo = await getLicenseInfo();

    // Check usage limit for free users
    if (!licenseInfo.isPro && licenseInfo.remainingUses <= 0) {
      figma.ui.postMessage({
        type: 'usage-limit-reached'
      });
      return;
    }
    try {
      const selection = figma.currentPage.selection;

      if (selection.length === 0) {
        figma.ui.postMessage({ type: 'error', message: 'No object selected' });
        return;
      }

      const node = selection[0];

      // Convert base64 to bytes
      const base64Data = msg.imageData.split(',')[1];
      const bytes = figma.base64Decode(base64Data);

      // Create image
      const image = figma.createImage(bytes);

      if (msg.isOriginal) {
        // Apply to original node
        console.log('🎯 Applying to original node:', node.type, node.name);

        if (node.type === 'RECTANGLE' || node.type === 'FRAME') {
          // Direct fill replacement for rectangles and frames
          if (!msg.keepOriginalSize) {
            // Используем размеры canvas если переданы
            if (msg.canvasWidth && msg.canvasHeight) {
              node.resize(msg.canvasWidth, msg.canvasHeight);
            } else {
              // Рассчитываем размер с учетом поворота
              let width = node.width;
              let height = node.height;

              if (msg.rotation && (msg.rotation.x !== 0 || msg.rotation.y !== 0 || msg.rotation.z !== 0)) {
                const diagonal = Math.sqrt(width * width + height * height);
                const rotationFactor = 1 + (Math.abs(msg.rotation.x || 0) + Math.abs(msg.rotation.y || 0)) / 90 * 0.5;
                const newSize = diagonal * rotationFactor;
                width = newSize;
                height = newSize;
              }

              node.resize(width, height);
            }
          }

          node.fills = [{
            type: 'IMAGE',
            imageHash: image.hash,
            scaleMode: msg.keepOriginalSize && (!msg.rotation || (msg.rotation.x === 0 && msg.rotation.y === 0 && msg.rotation.z === 0)) ? 'FILL' : 'FIT'
          }];

          // Don't apply 3D transformation - the image is already processed with rotations
        } else {
          // For groups, components, instances - create rectangle and replace
          console.log('🔄 Replacing complex node with rectangle');

          const newRect = figma.createRectangle();

          // Position and size
          newRect.x = node.x;
          newRect.y = node.y;

          // Всегда используем размеры canvas если они переданы
          if (msg.canvasWidth && msg.canvasHeight) {
            newRect.resize(msg.canvasWidth, msg.canvasHeight);
          } else if (msg.keepOriginalSize && (!msg.rotation || (msg.rotation.x === 0 && msg.rotation.y === 0 && msg.rotation.z === 0))) {
            newRect.resize(node.width, node.height);
          } else {
            // Рассчитываем размер с учетом поворота
            let width = node.width;
            let height = node.height;

            if (msg.rotation && (msg.rotation.x !== 0 || msg.rotation.y !== 0 || msg.rotation.z !== 0)) {
              const diagonal = Math.sqrt(width * width + height * height);
              const rotationFactor = 1 + (Math.abs(msg.rotation.x || 0) + Math.abs(msg.rotation.y || 0)) / 90 * 0.5;
              const newSize = diagonal * rotationFactor;
              width = newSize;
              height = newSize;
            }

            newRect.resize(width, height);
          }

          // Apply image
          newRect.fills = [{
            type: 'IMAGE',
            imageHash: image.hash,
            scaleMode: 'FIT' // FIT чтобы изображение не обрезалось
          }];

          // Name and insert
          newRect.name = node.name + ' (Rotated)';
          node.parent.appendChild(newRect);

          // Don't apply 3D transformation - the image is already processed with rotations

          // Remove original and select new
          node.remove();
          figma.currentPage.selection = [newRect];
        }
        figma.ui.postMessage({
          type: 'success',
          message: 'Rotation applied to original!'
        });
      } else {
        // Create new rotated copy
        const newNode = figma.createRectangle();

        // Всегда используем размеры canvas если они переданы (они учитывают поворот)
        if (msg.canvasWidth && msg.canvasHeight) {
          newNode.resize(msg.canvasWidth, msg.canvasHeight);
          newNode.fills = [{
            type: 'IMAGE',
            imageHash: image.hash,
            scaleMode: 'FIT' // FIT чтобы изображение полностью поместилось без обрезки
          }];
        } else if (msg.keepOriginalSize && (!msg.rotation || (msg.rotation.x === 0 && msg.rotation.y === 0 && msg.rotation.z === 0))) {
          // Сохраняем оригинальный размер только если нет поворотов
          newNode.resize(node.width, node.height);
          newNode.fills = [{
            type: 'IMAGE',
            imageHash: image.hash,
            scaleMode: 'FILL'
          }];
        } else {
          // Рассчитываем размер с учетом поворота
          let width = node.width;
          let height = node.height;

          if (msg.rotation && (msg.rotation.x !== 0 || msg.rotation.y !== 0 || msg.rotation.z !== 0)) {
            // Для поворотов увеличиваем размер чтобы изображение поместилось
            const diagonal = Math.sqrt(width * width + height * height);
            const rotationFactor = 1 + (Math.abs(msg.rotation.x || 0) + Math.abs(msg.rotation.y || 0)) / 90 * 0.5;
            const newSize = diagonal * rotationFactor;
            width = newSize;
            height = newSize;
          }

          newNode.resize(width, height);
          newNode.fills = [{
            type: 'IMAGE',
            imageHash: image.hash,
            scaleMode: 'FIT'
          }];
        }

        newNode.name = node.name + ' (Rotated)';

        // Position the copy next to the original
        newNode.x = node.x + node.width + 20;
        newNode.y = node.y;

        // Insert at the same level as the original node
        if (node.parent && node.parent.type !== 'PAGE') {
          // If original is inside a frame/group, add to the same parent
          node.parent.appendChild(newNode);
        } else {
          // If original is on the page level, add to page
          figma.currentPage.appendChild(newNode);
        }

        figma.currentPage.selection = [newNode];
        figma.viewport.scrollAndZoomIntoView([newNode]);

        // Don't apply 3D transformation in Figma - the image is already processed with rotations

        figma.ui.postMessage({
          type: 'success',
          message: msg.keepOriginalSize ? 'Copy created (original size)' : 'Copy created (auto-size)'
        });
      }

      // Increment usage for free users
      if (!licenseInfo.isPro) {
        const newCount = await incrementUsage();
        const remaining = Math.max(0, 10 - newCount);
        figma.ui.postMessage({
          type: 'usage-updated',
          usageCount: newCount,
          remainingUses: remaining
        });
      }

    } catch (error) {
      console.error('Apply rotation error:', error);
      figma.ui.postMessage({
        type: 'error',
        message: 'Failed to apply rotation'
      });
    }
  }

  if (msg.type === 'close-plugin') {
    figma.closePlugin();
  }

  // Handle license modal buttons
  if (msg.type === 'generate-challenge') {
    try {
      const challenge = await generateChallenge('mocup-studio', 'purchase');
      const botUrl = `https://t.me/Figma_Plugin_Bot?start=${challenge}`;
      figma.ui.postMessage({ type: 'challenge-response', challenge, botUrl });
    } catch (error) {
      console.error('Error generating challenge:', error);
      figma.ui.postMessage({
        type: 'challenge-error',
        message: 'Failed to generate challenge. Please try again.'
      });
    }
  }

  if (msg.type === 'generate-recovery-challenge') {
    try {
      const challenge = await generateChallenge('mocup-studio', 'recovery');
      const botUrl = `https://t.me/Figma_Plugin_Bot?start=recovery_${challenge}`;
      figma.ui.postMessage({ type: 'challenge-response', challenge, botUrl });
    } catch (error) {
      console.error('Error generating recovery challenge:', error);
      figma.ui.postMessage({
        type: 'challenge-error',
        message: 'Failed to generate recovery challenge. Please try again.'
      });
    }
  }

  if (msg.type === 'select-target-object') {
    try {
      const selection = figma.currentPage.selection;

      if (selection.length === 0) {
        figma.ui.postMessage({
          type: 'error',
          message: 'Please select an object to use as target overlay'
        });
        return;
      }

      const node = selection[0];

      // Export the selected node for overlay
      const bytes = await node.exportAsync({
        format: 'PNG',
        constraint: { type: 'SCALE', value: 1 },
        contentsOnly: true,
        useAbsoluteBounds: false
      });

      const base64 = figma.base64Encode(bytes);

      figma.ui.postMessage({
        type: 'target-object-selected',
        imageData: `data:image/png;base64,${base64}`,
        name: node.name,
        width: node.width,
        height: node.height
      });

    } catch (error) {
      console.error('Target object export error:', error);
      figma.ui.postMessage({
        type: 'error',
        message: 'Failed to export target object'
      });
    }
  }

  // Smart Insert Mode handlers
  if (msg.type === 'select-phone-mockup') {
    try {
      const selection = figma.currentPage.selection;

      if (selection.length === 0) {
        figma.ui.postMessage({
          type: 'error',
          message: 'Please select a phone mockup object'
        });
        return;
      }

      let phoneNode = selection[0];

      // If selected node is a frame/group, try to find phone inside
      if (phoneNode.type === 'FRAME' || phoneNode.type === 'GROUP') {
        console.log('🔍 Selected frame/group, looking for phone inside...');

        // Look for children that might be phones (smaller rectangles/components)
        const children = phoneNode.children;
        let bestCandidate = null;
        let bestScore = 0;

        for (const child of children) {
          if (child.type === 'RECTANGLE' || child.type === 'COMPONENT' || child.type === 'INSTANCE') {
            // Score based on aspect ratio (phones are usually tall)
            const aspectRatio = child.height / child.width;
            const score = aspectRatio > 1.5 && aspectRatio < 3 ? aspectRatio : 0;

            if (score > bestScore) {
              bestScore = score;
              bestCandidate = child;
            }
          }
        }

        if (bestCandidate) {
          console.log('📱 Found phone candidate:', bestCandidate.name, 'aspect ratio:', bestCandidate.height / bestCandidate.width);
          phoneNode = bestCandidate;
        } else {
          console.log('📱 No phone found inside, using original selection');
        }
      }

      console.log('📱 Using phone node:', {
        name: phoneNode.name,
        type: phoneNode.type,
        width: phoneNode.width,
        height: phoneNode.height
      });

      // Export the phone mockup
      const bytes = await phoneNode.exportAsync({
        format: 'PNG',
        constraint: { type: 'SCALE', value: 1 },
        contentsOnly: true,
        useAbsoluteBounds: false
      });

      const base64 = figma.base64Encode(bytes);

      figma.ui.postMessage({
        type: 'phone-mockup-selected',
        imageData: `data:image/png;base64,${base64}`,
        name: phoneNode.name,
        width: phoneNode.width,
        height: phoneNode.height
      });

    } catch (error) {
      console.error('Phone mockup export error:', error);
      figma.ui.postMessage({
        type: 'error',
        message: 'Failed to export phone mockup'
      });
    }
  }

  if (msg.type === 'smart-insert') {
    try {
      const licenseInfo = await getLicenseInfo();

      // Check usage limit for free users
      if (!licenseInfo.isPro && licenseInfo.remainingUses <= 0) {
        figma.ui.postMessage({
          type: 'usage-limit-reached'
        });
        return;
      }

      const selection = figma.currentPage.selection;
      if (selection.length === 0) {
        figma.ui.postMessage({ type: 'error', message: 'No phone mockup selected' });
        return;
      }

      const phoneMockup = selection[0];

      // Convert image data to bytes
      const base64Data = msg.imageData.split(',')[1];
      const bytes = figma.base64Decode(base64Data);
      const image = figma.createImage(bytes);

      // Create new rectangle for the screen content
      const screenRect = figma.createRectangle();

      // Position and size based on calculated positioning
      const pos = msg.positioning;

      console.log('📱 Phone mockup:', {
        x: phoneMockup.x,
        y: phoneMockup.y,
        width: phoneMockup.width,
        height: phoneMockup.height,
        rotation: phoneMockup.rotation
      });

      console.log('🎯 Calculated positioning:', pos);

      // NEW APPROACH: Clone phone's transform and position screen relative to it

      // First, resize the screen rect
      screenRect.resize(pos.width, pos.height);

      // Get phone's transform matrix
      const phoneTransform = phoneMockup.relativeTransform;

      console.log('📱 Phone transform matrix:', phoneTransform);

      // Calculate screen position in phone's local coordinate system
      // Screen position is relative to phone's top-left corner
      const screenLocalX = pos.x;
      const screenLocalY = pos.y;

      console.log('📐 Screen local position:', { x: screenLocalX, y: screenLocalY });

      // Apply phone's transform to screen position
      // Transform the local screen position to world coordinates
      const worldX = phoneTransform[0][0] * screenLocalX + phoneTransform[0][1] * screenLocalY + phoneTransform[0][2];
      const worldY = phoneTransform[1][0] * screenLocalX + phoneTransform[1][1] * screenLocalY + phoneTransform[1][2];

      console.log('🌍 Screen world position:', { x: worldX, y: worldY });

      // Position the screen rect
      screenRect.x = worldX;
      screenRect.y = worldY;

      // Apply the same transform as the phone (rotation and scale)
      // But keep the screen's own position
      screenRect.relativeTransform = [
        [phoneTransform[0][0], phoneTransform[0][1], worldX],
        [phoneTransform[1][0], phoneTransform[1][1], worldY]
      ];

      console.log('📱 Applied transform to screen:', screenRect.relativeTransform);

      console.log('📍 Final screen position:', {
        x: screenRect.x,
        y: screenRect.y,
        width: screenRect.width,
        height: screenRect.height
      });

      // Apply rotation if specified
      if (pos.rotation && pos.rotation !== 0) {
        const radians = (pos.rotation * Math.PI) / 180;
        screenRect.relativeTransform = [
          [Math.cos(radians), -Math.sin(radians), screenRect.x],
          [Math.sin(radians), Math.cos(radians), screenRect.y]
        ];
      }

      // Apply image fill
      screenRect.fills = [{
        type: 'IMAGE',
        imageHash: image.hash,
        scaleMode: 'FILL'
      }];

      screenRect.name = 'Screen Content';

      // Add to same parent as phone mockup
      phoneMockup.parent.appendChild(screenRect);

      // Select the new screen content
      figma.currentPage.selection = [screenRect];
      figma.viewport.scrollAndZoomIntoView([screenRect]);

      figma.ui.postMessage({
        type: 'success',
        message: 'Smart insert completed! Image positioned in phone screen.'
      });

      // Increment usage for free users
      if (!licenseInfo.isPro) {
        const newCount = await incrementUsage();
        const remaining = Math.max(0, 10 - newCount);
        figma.ui.postMessage({
          type: 'usage-updated',
          usageCount: newCount,
          remainingUses: remaining
        });
      }

    } catch (error) {
      console.error('Smart insert error:', error);
      figma.ui.postMessage({
        type: 'error',
        message: 'Failed to perform smart insert'
      });
    }
  }

  // Screen Replace Mode handlers
  if (msg.type === 'select-phone-image') {
    try {
      const selection = figma.currentPage.selection;

      if (selection.length === 0) {
        figma.ui.postMessage({
          type: 'error',
          message: 'Please select a phone image'
        });
        return;
      }

      let phoneNode = selection[0];

      // If selected node is a frame/group, try to find phone inside (same as Smart Insert)
      if (phoneNode.type === 'FRAME' || phoneNode.type === 'GROUP') {
        console.log('🔍 Selected frame/group, looking for phone inside...');

        // Look for children that might be phones (smaller rectangles/components)
        const children = phoneNode.children;
        let bestCandidate = null;
        let bestScore = 0;

        for (const child of children) {
          if (child.type === 'RECTANGLE' || child.type === 'COMPONENT' || child.type === 'INSTANCE') {
            // Score based on aspect ratio (phones are usually tall)
            const aspectRatio = child.height / child.width;
            const score = aspectRatio > 1.5 && aspectRatio < 3 ? aspectRatio : 0;

            if (score > bestScore) {
              bestScore = score;
              bestCandidate = child;
            }
          }
        }

        if (bestCandidate) {
          console.log('📱 Found phone candidate:', bestCandidate.name, 'aspect ratio:', bestCandidate.height / bestCandidate.width);
          phoneNode = bestCandidate;
        } else {
          console.log('📱 No phone found inside, using original selection');
        }
      }

      console.log('📱 Selected phone image:', {
        name: phoneNode.name,
        type: phoneNode.type,
        width: phoneNode.width,
        height: phoneNode.height
      });

      // Show loading message for complex mockups
      if (phoneNode.type === 'INSTANCE' || phoneNode.type === 'COMPONENT') {
        figma.ui.postMessage({
          type: 'export-progress',
          message: 'Exporting complex mockup, please wait...'
        });
      }

      // Export the phone image with optimized settings for faster loading
      const bytes = await phoneNode.exportAsync({
        format: 'PNG',
        constraint: { type: 'SCALE', value: 0.5 }, // Reduced quality for faster export
        contentsOnly: true,
        useAbsoluteBounds: false
      });

      const base64 = figma.base64Encode(bytes);

      figma.ui.postMessage({
        type: 'phone-image-selected',
        imageData: `data:image/png;base64,${base64}`,
        name: phoneNode.name,
        width: phoneNode.width,
        height: phoneNode.height
      });

    } catch (error) {
      console.error('Phone image export error:', error);
      figma.ui.postMessage({
        type: 'error',
        message: 'Failed to export phone image'
      });
    }
  }

  if (msg.type === 'screen-replace') {
    try {
      const licenseInfo = await getLicenseInfo();

      // Check usage limit for free users
      if (!licenseInfo.isPro && licenseInfo.remainingUses <= 0) {
        figma.ui.postMessage({
          type: 'usage-limit-reached'
        });
        return;
      }

      const selection = figma.currentPage.selection;
      if (selection.length === 0) {
        figma.ui.postMessage({ type: 'error', message: 'No phone image selected' });
        return;
      }

      const phoneImage = selection[0];

      console.log('🔄 Screen Replace Process:', {
        phoneImage: { name: phoneImage.name, width: phoneImage.width, height: phoneImage.height },
        screenMask: msg.screenMask
      });

      // Convert content image data to bytes
      const base64Data = msg.contentImageData.split(',')[1];
      const bytes = figma.base64Decode(base64Data);
      const contentImage = figma.createImage(bytes);

      // Get phone's transform matrix to copy rotation
      const phoneTransform = phoneImage.relativeTransform;

      console.log('📱 Phone transform:', phoneTransform);

      // Create a frame to hold both phone and screen content
      const containerFrame = figma.createFrame();
      containerFrame.name = phoneImage.name + ' (Screen Replaced)';
      containerFrame.resize(phoneImage.width, phoneImage.height);

      // Position next to original phone
      containerFrame.x = phoneImage.x + phoneImage.width + 50;
      containerFrame.y = phoneImage.y;

      // Copy phone's rotation to container
      containerFrame.relativeTransform = [
        [phoneTransform[0][0], phoneTransform[0][1], containerFrame.x],
        [phoneTransform[1][0], phoneTransform[1][1], containerFrame.y]
      ];

      console.log('📦 Container transform:', containerFrame.relativeTransform);

      // Copy phone image as background
      const phoneRect = figma.createRectangle();
      phoneRect.resize(phoneImage.width, phoneImage.height);
      phoneRect.fills = phoneImage.fills; // Copy original fills
      phoneRect.name = 'Phone Background';
      containerFrame.appendChild(phoneRect);

      // Create screen content with mask
      const screenRect = figma.createRectangle();
      const mask = msg.screenMask;

      // Position screen content within the frame (local coordinates)
      screenRect.x = mask.x;
      screenRect.y = mask.y;
      screenRect.resize(mask.width, mask.height);

      console.log('📱 Screen rect position:', {
        x: screenRect.x,
        y: screenRect.y,
        width: screenRect.width,
        height: screenRect.height
      });

      // Apply content image
      screenRect.fills = [{
        type: 'IMAGE',
        imageHash: contentImage.hash,
        scaleMode: 'FILL'
      }];

      // Apply corner radius based on shape
      if (mask.shape === 'rounded') {
        screenRect.cornerRadius = Math.min(mask.width, mask.height) * 0.05; // 5% corner radius
      } else if (mask.shape === 'oval') {
        screenRect.cornerRadius = Math.min(mask.width, mask.height) / 2; // Full oval
      }

      screenRect.name = 'Screen Content';
      containerFrame.appendChild(screenRect);

      // Apply additional rotation if specified in UI
      if (msg.rotation && msg.rotation !== 0) {
        const radians = (msg.rotation * Math.PI) / 180;
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);

        // Combine phone rotation with additional rotation
        const newTransform = [
          [phoneTransform[0][0] * cos - phoneTransform[0][1] * sin,
          phoneTransform[0][0] * sin + phoneTransform[0][1] * cos,
          containerFrame.x],
          [phoneTransform[1][0] * cos - phoneTransform[1][1] * sin,
          phoneTransform[1][0] * sin + phoneTransform[1][1] * cos,
          containerFrame.y]
        ];

        containerFrame.relativeTransform = newTransform;
        console.log('🔄 Combined transform applied:', newTransform);
      }

      // Add to page and select
      figma.currentPage.appendChild(containerFrame);
      figma.currentPage.selection = [containerFrame];
      figma.viewport.scrollAndZoomIntoView([containerFrame]);

      figma.ui.postMessage({
        type: 'success',
        message: 'Screen replaced successfully! New phone with content created.'
      });

      // Increment usage for free users
      if (!licenseInfo.isPro) {
        const newCount = await incrementUsage();
        const remaining = Math.max(0, 10 - newCount);
        figma.ui.postMessage({
          type: 'usage-updated',
          usageCount: newCount,
          remainingUses: remaining
        });
      }

    } catch (error) {
      console.error('Screen replace error:', error);
      figma.ui.postMessage({
        type: 'error',
        message: 'Failed to replace screen content'
      });
    }
  }

  // Manual Screen Mode handlers
  if (msg.type === 'manual-select-mockup') {
    try {
      const selection = figma.currentPage.selection;

      if (selection.length === 0) {
        figma.ui.postMessage({
          type: 'error',
          message: 'Please select a mockup object'
        });
        return;
      }

      const mockup = selection[0];

      console.log('📱 Manual mockup selected:', {
        name: mockup.name,
        type: mockup.type,
        width: mockup.width,
        height: mockup.height
      });

      figma.ui.postMessage({
        type: 'manual-mockup-selected',
        name: mockup.name,
        width: mockup.width,
        height: mockup.height,
        x: mockup.x,
        y: mockup.y,
        transform: mockup.relativeTransform,
        id: mockup.id
      });

    } catch (error) {
      console.error('Manual mockup selection error:', error);
      figma.ui.postMessage({
        type: 'error',
        message: 'Failed to select mockup'
      });
    }
  }

  if (msg.type === 'manual-select-screen-area') {
    try {
      const selection = figma.currentPage.selection;

      if (selection.length === 0) {
        figma.ui.postMessage({
          type: 'error',
          message: 'Please select a screen area (rectangle inside the phone)'
        });
        return;
      }

      const screenArea = selection[0];

      // Store reference to the selected node for later replacement
      figma.clientStorage.setAsync('manual-screen-area-id', screenArea.id);

      console.log('📐 Manual screen area selected:', {
        name: screenArea.name,
        type: screenArea.type,
        width: screenArea.width,
        height: screenArea.height,
        x: screenArea.x,
        y: screenArea.y,
        id: screenArea.id
      });

      // Use absolute coordinates for proper positioning
      const bounds = screenArea.absoluteBoundingBox;

      figma.ui.postMessage({
        type: 'manual-screen-area-selected',
        name: screenArea.name,
        width: screenArea.width,
        height: screenArea.height,
        x: bounds ? bounds.x : screenArea.x,
        y: bounds ? bounds.y : screenArea.y,
        transform: screenArea.relativeTransform,
        id: screenArea.id
      });

    } catch (error) {
      console.error('Manual screen area selection error:', error);
      figma.ui.postMessage({
        type: 'error',
        message: 'Failed to select screen area'
      });
    }
  }

  if (msg.type === 'manual-insert') {
    try {
      const licenseInfo = await getLicenseInfo();

      // Check usage limit for free users
      if (!licenseInfo.isPro && licenseInfo.remainingUses <= 0) {
        figma.ui.postMessage({
          type: 'usage-limit-reached'
        });
        return;
      }

      console.log('🎯 Manual insert:', {
        mockup: msg.mockupData,
        screenArea: msg.screenAreaData,
        rotation: msg.rotation
      });

      // Check if we're trying to replace the same image that was selected
      const currentSelection = figma.currentPage.selection;
      if (currentSelection.length > 0) {
        const selectedNode = currentSelection[0];
        console.log('🔍 Currently selected node:', selectedNode.name, selectedNode.id);
        console.log('🎯 Target screen area:', msg.screenAreaData.name, msg.screenAreaData.id);

        // If the selected image is the same as screen area, show error
        if (selectedNode.id === msg.screenAreaData.id) {
          figma.ui.postMessage({
            type: 'error',
            message: 'Cannot replace screen area with itself! Please select a different image to insert.'
          });
          return;
        }
      }

      // Convert image data to bytes
      const base64Data = msg.imageData.split(',')[1];
      const bytes = figma.base64Decode(base64Data);
      const image = figma.createImage(bytes);

      // Try to find the selected screen area node to replace its content
      let targetNode = null;

      // First try to find by stored ID
      try {
        const storedId = await figma.clientStorage.getAsync('manual-screen-area-id');
        if (storedId && msg.screenAreaData.id === storedId) {
          targetNode = figma.getNodeById(storedId);
          console.log('🎯 Found target node by ID:', targetNode ? targetNode.name : 'null');
        }
      } catch (e) {
        console.log('Could not find node by ID, falling back to coordinate search');
      }

      // Fallback: Search by name first, then coordinates
      if (!targetNode) {
        function findNodeByName(node, targetName) {
          if (node.name === targetName) {
            console.log('🎯 Found node by name:', node.name, node.type);
            return node;
          }

          if ('children' in node) {
            for (const child of node.children) {
              const found = findNodeByName(child, targetName);
              if (found) return found;
            }
          }

          return null;
        }

        // First try to find by name
        targetNode = findNodeByName(figma.currentPage, msg.screenAreaData.name);

        // If not found by name, try coordinates
        if (!targetNode) {
          function findNodeByProperties(node, targetX, targetY, targetWidth, targetHeight) {
            // More tolerant matching for different node types
            const tolerance = ['GROUP', 'INSTANCE', 'VECTOR'].includes(node.type) ? 5 : 1;

            if (Math.abs(node.x - targetX) < tolerance &&
              Math.abs(node.y - targetY) < tolerance &&
              Math.abs(node.width - targetWidth) < tolerance &&
              Math.abs(node.height - targetHeight) < tolerance) {
              console.log('🎯 Found node by coordinates:', node.name, node.type);
              return node;
            }

            if ('children' in node) {
              for (const child of node.children) {
                const found = findNodeByProperties(child, targetX, targetY, targetWidth, targetHeight);
                if (found) return found;
              }
            }

            return null;
          }

          targetNode = findNodeByProperties(
            figma.currentPage,
            msg.screenAreaData.x,
            msg.screenAreaData.y,
            msg.screenAreaData.width,
            msg.screenAreaData.height
          );
        }
      }

      if (targetNode) {
        console.log('📝 Found target node:', targetNode.name, targetNode.type);

        if (targetNode.type === 'RECTANGLE' || targetNode.type === 'FRAME') {
          // Replace the content of existing rectangle/frame
          console.log('🔄 Replacing content of existing node:', targetNode.name);

          targetNode.fills = [{
            type: 'IMAGE',
            imageHash: image.hash,
            scaleMode: 'FILL'
          }];

          // Apply 3D transformations using helper function
          apply3DTransform(targetNode, msg.rotation, msg.mockupPerspective);

          if (!targetNode.name.includes('(Content)')) {
            targetNode.name = targetNode.name + ' (Content)';
          }

          figma.currentPage.selection = [targetNode];
          figma.viewport.scrollAndZoomIntoView([targetNode]);

        } else if (targetNode.type === 'GROUP') {
          // For groups, create a new rectangle inside them
          console.log('📦 Creating rectangle inside group:', targetNode.name);

          const newRect = figma.createRectangle();

          // Position relative to the group's bounds
          const bounds = targetNode.absoluteBoundingBox;
          if (bounds) {
            newRect.x = bounds.x;
            newRect.y = bounds.y;
            newRect.resize(bounds.width, bounds.height);
          } else {
            // Fallback to node properties
            newRect.x = targetNode.x;
            newRect.y = targetNode.y;
            newRect.resize(targetNode.width, targetNode.height);
          }

          // Copy transform from parent to inherit rotation/scale
          if (targetNode.relativeTransform) {
            newRect.relativeTransform = [
              [...targetNode.relativeTransform[0]],
              [...targetNode.relativeTransform[1]]
            ];
          }

          newRect.fills = [{
            type: 'IMAGE',
            imageHash: image.hash,
            scaleMode: 'FILL'
          }];

          // Apply 3D transformations using helper function
          apply3DTransform(newRect, msg.rotation, msg.mockupPerspective, newRect.relativeTransform);

          newRect.name = `${targetNode.name} (Screen Content)`;

          // Add to the same parent as the target group
          if (targetNode.parent) {
            targetNode.parent.appendChild(newRect);
          } else {
            figma.currentPage.appendChild(newRect);
          }

          figma.currentPage.selection = [newRect];
          figma.viewport.scrollAndZoomIntoView([newRect]);

        } else if (targetNode.type === 'INSTANCE') {
          // For instances, create rectangle at the same level (can't add inside instance)
          console.log('📦 Creating rectangle at same level as instance:', targetNode.name);

          const newRect = figma.createRectangle();

          // Position exactly over the instance
          const bounds = targetNode.absoluteBoundingBox;
          if (bounds) {
            newRect.x = bounds.x;
            newRect.y = bounds.y;
            newRect.resize(bounds.width, bounds.height);
          } else {
            newRect.x = targetNode.x;
            newRect.y = targetNode.y;
            newRect.resize(targetNode.width, targetNode.height);
          }

          // Copy transform from instance to inherit rotation/scale
          if (targetNode.relativeTransform) {
            newRect.relativeTransform = [
              [...targetNode.relativeTransform[0]],
              [...targetNode.relativeTransform[1]]
            ];
          }

          newRect.fills = [{
            type: 'IMAGE',
            imageHash: image.hash,
            scaleMode: 'FILL'
          }];

          // Apply 3D transformations using helper function
          apply3DTransform(newRect, msg.rotation, msg.mockupPerspective, newRect.relativeTransform);

          newRect.name = `${targetNode.name} (Screen Overlay)`;

          // Add to the same parent as the instance
          if (targetNode.parent) {
            targetNode.parent.appendChild(newRect);
          } else {
            figma.currentPage.appendChild(newRect);
          }

          figma.currentPage.selection = [newRect];
          figma.viewport.scrollAndZoomIntoView([newRect]);

        } else if (targetNode.type === 'VECTOR') {
          // For vectors, create rectangle at same position
          console.log('📦 Creating rectangle to replace vector:', targetNode.name);

          const newRect = figma.createRectangle();

          // Use exact position and size of vector
          newRect.x = targetNode.x;
          newRect.y = targetNode.y;
          newRect.resize(targetNode.width, targetNode.height);

          // Copy transform from vector
          if (targetNode.relativeTransform) {
            newRect.relativeTransform = [
              [...targetNode.relativeTransform[0]],
              [...targetNode.relativeTransform[1]]
            ];
          }

          newRect.fills = [{
            type: 'IMAGE',
            imageHash: image.hash,
            scaleMode: 'FILL'
          }];

          // Apply 3D transformations using helper function
          apply3DTransform(newRect, msg.rotation, msg.mockupPerspective);

          newRect.name = `${targetNode.name} (Content)`;

          // Add to the same parent as the vector
          if (targetNode.parent) {
            targetNode.parent.appendChild(newRect);
          } else {
            figma.currentPage.appendChild(newRect);
          }

          figma.currentPage.selection = [newRect];
          figma.viewport.scrollAndZoomIntoView([newRect]);

        } else {
          console.log('⚠️ Unsupported node type:', targetNode.type);
          targetNode = null; // Force fallback
        }
      }

      if (!targetNode) {
        // Fallback: Create new rectangle if we can't find the original
        console.log('📦 Creating new rectangle (fallback)');

        const newRect = figma.createRectangle();
        newRect.x = msg.screenAreaData.x;
        newRect.y = msg.screenAreaData.y;
        newRect.resize(msg.screenAreaData.width, msg.screenAreaData.height);

        if (msg.screenAreaData.transform) {
          newRect.relativeTransform = msg.screenAreaData.transform;
        }

        newRect.fills = [{
          type: 'IMAGE',
          imageHash: image.hash,
          scaleMode: 'FILL'
        }];

        // Apply rotation
        if (msg.rotation) {
          let rotationZ = 0;

          if (typeof msg.rotation === 'number') {
            rotationZ = msg.rotation;
          } else if (msg.rotation.z) {
            rotationZ = msg.rotation.z;
          }

          if (rotationZ !== 0) {
            const radians = (rotationZ * Math.PI) / 180;
            const cos = Math.cos(radians);
            const sin = Math.sin(radians);

            const centerX = newRect.x + newRect.width / 2;
            const centerY = newRect.y + newRect.height / 2;

            newRect.relativeTransform = [
              [cos, -sin, centerX - centerX * cos + centerY * sin],
              [sin, cos, centerY - centerX * sin - centerY * cos]
            ];
          }
        }

        newRect.name = 'Screen Content (Manual)';

        figma.currentPage.appendChild(newRect);
        figma.currentPage.selection = [newRect];
        figma.viewport.scrollAndZoomIntoView([newRect]);
      }

      let successMessage = '✅ Manual insert completed!';

      if (targetNode) {
        if (targetNode.type === 'RECTANGLE' || targetNode.type === 'FRAME') {
          successMessage = `✅ Content replaced in "${targetNode.name}"! Image fill applied.`;
        } else if (targetNode.type === 'GROUP') {
          successMessage = `✅ Screen content created inside group "${targetNode.name}"! Inherits rotation.`;
        } else if (targetNode.type === 'INSTANCE') {
          successMessage = `✅ Screen overlay created over instance "${targetNode.name}"! Inherits rotation.`;
        } else if (targetNode.type === 'VECTOR') {
          successMessage = `✅ Rectangle created to replace vector "${targetNode.name}"! Inherits position and rotation.`;
        }
      } else {
        successMessage = '✅ New image element created in selected area.';
      }

      figma.ui.postMessage({
        type: 'success',
        message: successMessage
      });

      // Increment usage for free users
      if (!licenseInfo.isPro) {
        const newCount = await incrementUsage();
        const remaining = Math.max(0, 10 - newCount);
        figma.ui.postMessage({
          type: 'usage-updated',
          usageCount: newCount,
          remainingUses: remaining
        });
      }

    } catch (error) {
      console.error('Manual insert error:', error);
      figma.ui.postMessage({
        type: 'error',
        message: 'Failed to perform manual insert'
      });
    }
  }

  if (msg.type === 'activate-with-key') {
    const success = await activateProWithKey(msg.key, msg.testOtherDevice);
    return;
  }
};

// Key activation function
async function activateProWithKey(key, testOtherDevice = false) {
  try {
    console.log('🔑 Activating key:', key);

    // Validate key format
    if (!key || !key.startsWith('MS-')) {
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

      if (keyData.pluginId !== 'mocup-studio') {
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

      // Handle reset keys
      if (keyData.subscriptionType === 'reset') {
        await figma.clientStorage.setAsync('mocup-studio-pro', false);
        await figma.clientStorage.setAsync('mocup-studio-pro-expiry', 0);
        await figma.clientStorage.setAsync('mocup-studio-usage-count', 0);

        figma.ui.postMessage({
          type: 'key-activation-response',
          success: true,
          action: 'reset',
          message: 'Subscription reset successfully'
        });
        return true;
      }

      // Check expiration for non-lifetime keys
      if (keyData.subscriptionType !== 'lifetime' && keyData.subscriptionType !== 'reset') {
        if (keyData.expirationDate) {
          const now = new Date();
          const expiryDate = new Date(keyData.expirationDate);
          if (now >= expiryDate) {
            console.log('🚫 Key expired');
            figma.ui.postMessage({
              type: 'key-activation-response',
              success: false,
              error: 'expired',
              message: 'Key has expired'
            });
            return false;
          }
        }
      }

      // Activate subscription
      const expiryTime = keyData.expirationDate ? new Date(keyData.expirationDate).getTime() : 0;

      await figma.clientStorage.setAsync('mocup-studio-pro', true);
      await figma.clientStorage.setAsync('mocup-studio-pro-expiry', expiryTime);

      const keyInfo = {
        subscriptionType: keyData.subscriptionType,
        purchaseDate: keyData.purchaseDate,
        expirationDate: keyData.expirationDate,
        isAdminGenerated: keyData.adminGenerated || false
      };

      await figma.clientStorage.setAsync('mocup-studio-key-info', JSON.stringify(keyInfo));

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

// Challenge generation functions
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

// Base64 decode function
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

// Send initial message and export current selection
figma.ui.postMessage({ type: 'init' });
exportCurrentSelection();