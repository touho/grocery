import React, { Component } from "react";
import { SLU_STATE } from "./../sg";

const applySelectedProduct = segments =>
  segments.map(sg => {
    return {
      ...sg,
      selectedProduct: sg.products.length && sg.products[0]
    };
  });

const defaultState = {
  startRecording: () => {},
  stopRecording: () => {},
  toggleItemSubView: item => {},
  clearList: () => {},
  addToCart: () => {},
  sluContext: {},
  finalItems: [],
  currentInterimItems: [],
  sluState: SLU_STATE.notConnected,
  subViewItem: undefined,
  subViewOpen: false,
  focusedItem: undefined
};

const AppContext = React.createContext(defaultState);
class AppContextProvider extends Component {
  state = defaultState;
  componentDidMount() {
    const itemsInStorageJSON = localStorage.getItem("items");
    if (itemsInStorageJSON) {
      const itemsInStorage = JSON.parse(itemsInStorageJSON);
      this.setState({ finalItems: itemsInStorage });
    }

    let sluContext = this.props.sluContext;

    sluContext.ontranscription = data => {
      const { type, segments } = data;
      if (type === "interimItem") {
        this.setState({
          currentInterimItems: applySelectedProduct(segments)
        });
      } else if (type === "finalItem") {
        const modifiedSegments = applySelectedProduct(segments);
        console.log("on transcript modified segments", modifiedSegments);
        const finalItemsModified = [
          ...modifiedSegments,
          ...this.state.finalItems
        ];
        localStorage.setItem("items", JSON.stringify(finalItemsModified));
        this.setState({
          finalItems: finalItemsModified,
          currentInterimItems: []
        });
      }
    };

    sluContext.onstatechange = text => {
      this.setState({
        sluState: text
      });
    };
    this.setState({
      sluContext
    });
  }
  startRecording = event => {
    console.log("startRecording", event);
    try {
      this.state.sluContext.start(event);
      this.setState({ subViewOpen: false });
    } catch (err) {
      console.error(err);
    }
  };

  toggleItemSubView = item => {
    this.setState({
      subViewItem: item,
      subViewOpen: !this.state.subViewOpen
    });
  };

  stopRecording = event => {
    console.log("stopRecording", event);
    this.setState({ subViewOpen: false });
    this.state.sluContext.stop(event);
  };

  clearList = () => {
    this.setState({ finalItems: [], subViewOpen: false });
    localStorage.removeItem("items");
  };

  addToCart = () => {
    const selectedProductIds = this.state.finalItems
      .map(fi => `${fi.selectedProduct.productid}`)
      .join(",");
    window.open(
      `${process.env.REACT_APP_ECOM_URL}${selectedProductIds}`,
      "new"
    );
  };

  onItemRemove = item => {
    const modifiedList = this.state.finalItems.filter(
      finalItem => finalItem.queryId !== item.queryId
    );
    this.setState({ finalItems: modifiedList, subViewItem: undefined });
  };

  onItemIncrease = item => this.modifyListItemWithOperation(item, "increase");

  onItemDecrease = item => this.modifyListItemWithOperation(item, "decrease");

  onItemFocused = item => {
    this.setState({
      focusedItem:
        this.state.focusedItem &&
        this.state.focusedItem.queryId === item.queryId
          ? null
          : item //toggles or switches bbetween items
    });
  };

  subViewItemSelected = product => {
    let { subViewItem, finalItems } = this.state;
    subViewItem.selectedProduct = product;

    let subViewItemIndexInFinalItems = finalItems.findIndex(
      finalItem => finalItem.queryId === subViewItem.queryId
    );
    finalItems[subViewItemIndexInFinalItems] = subViewItem;

    this.setState({ finalItems, subViewOpen: !this.state.subViewOpen });
    localStorage.setItem("items", JSON.stringify(finalItems));
  };

  modifyListItemWithOperation(item, operation) {
    let modifiedItem = { ...item };
    switch (operation) {
      case "increase":
        modifiedItem.selectedProduct.amount++;
        break;
      case "decrease":
        if (modifiedItem.selectedProduct.amount > 0) {
          modifiedItem.selectedProduct.amount--;
        }
        break;
      default:
        break;
    }
    let { focusedItem, finalItems } = this.state;
    let modifiedItemIndexInFinalItems = finalItems.findIndex(
      finalItem => finalItem.queryId === focusedItem.queryId
    );
    finalItems[modifiedItemIndexInFinalItems] = modifiedItem;
    this.setState({ finalItems });
  }

  render() {
    return (
      <AppContext.Provider
        value={{
          ...this.state,
          startRecording: this.startRecording,
          stopRecording: this.stopRecording,
          clearList: this.clearList,
          addToCart: this.addToCart,
          toggleItemSubView: this.toggleItemSubView,
          subViewItemSelected: this.subViewItemSelected,
          onItemFocused: this.onItemFocused,
          onItemRemove: this.onItemRemove,
          onItemDecrease: this.onItemDecrease,
          onItemIncrease: this.onItemIncrease
        }}
      >
        {this.props.children}
      </AppContext.Provider>
    );
  }
}

export default AppContext;
export { AppContextProvider };
