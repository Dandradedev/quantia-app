import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AdicionarAtivo from './src/telas/AdicionarAtivo';
import Cadastro from './src/telas/Cadastro';
import Login from './src/telas/Login';
import PainelPrincipal from './src/telas/PainelPrincipal';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Login" 
        screenOptions={{
          headerStyle: { backgroundColor: '#000' }, 
          headerTintColor: '#FFF', 
          headerTitleStyle: { fontWeight: 'bold' },
          headerShadowVisible: false, 
        }}
      >
        {}
        <Stack.Screen 
          name="Login" 
          component={Login} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="Cadastro" 
          component={Cadastro} 
          options={{ headerShown: false }} 
        />

        {}
        <Stack.Screen 
          name="Painel" 
          component={PainelPrincipal} 
          options={{ 
            title: '', 
            headerBackVisible: false 
          }} 
        />
        <Stack.Screen 
          name="Adicionar" 
          component={AdicionarAtivo} 
          options={{ 
            title: 'Novo Ativo',
            presentation: 'modal' 
          }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}